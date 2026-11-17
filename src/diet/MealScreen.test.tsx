import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DietDay, DietItem, DietPlan, Menu } from './types'
import { dayFromMenu, skipItem, toggleMeal } from './day'
import { MealScreen } from './MealScreen'

const it_ = (id: string, name: string, kcal: number, grams = 100, source: DietItem['source'] = 'custom'): DietItem => ({ id, name, grams, per100: { kcal, p: 10, c: 20, f: 5 }, source })
const menuA: Menu = {
  id: 'A', name: 'Dia de treino',
  meals: [{
    id: 'm1', name: 'Almoço', time: '12:30',
    options: [
      { id: 'o1', name: 'Frango e arroz', items: [it_('i1', 'Frango', 165, 150), it_('i2', 'Arroz', 130, 120)] },
      { id: 'o2', items: [it_('i3', 'Carne', 220, 150)] },
    ],
  }],
}
const menuB: Menu = { id: 'B', name: 'Descanso', meals: [{ id: 'mb', name: 'Jantar', time: '20:00', options: [{ id: 'ob', items: [it_('ib', 'Sopa', 50, 300)] }] }] }
const plan: DietPlan = { menus: [menuA, menuB] }

// dia em memória: o `act` aplica na cópia, guarda em `stored` e re-renderiza com a refeição salva
let stored: DietDay
function Harness({ initial, noMenu = false, dayFree = false, onClose = () => {} }: { initial: DietDay; noMenu?: boolean; dayFree?: boolean; onClose?: () => void }) {
  const [day, setDay] = useState(initial)
  return <MealScreen meal={day.meals[0]} menu={noMenu ? undefined : menuA} plan={plan} dayFree={dayFree} act={(f) => setDay((d) => (stored = f(d)))} onClose={onClose} />
}

test('toggle troca a opção e os itens', async () => {
  const user = userEvent.setup()
  render(<Harness initial={dayFromMenu(menuA)} />)
  expect(screen.getByRole('heading', { name: 'Almoço · 12:30' })).toBeInTheDocument()
  expect(screen.getByRole('radiogroup', { name: 'Opção' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
  expect(screen.getByText('Opção A · Frango e arroz')).toBeInTheDocument()
  expect(screen.getByText('404 kcal · P 27 · C 54 · G 14')).toBeInTheDocument()

  await user.click(screen.getByRole('radio', { name: 'B' }))
  expect(screen.getByRole('radio', { name: 'B' })).toBeChecked()
  expect(screen.getByText('Opção B')).toBeInTheDocument()
  expect(screen.getByText('Carne')).toBeInTheDocument()
  expect(screen.queryByText('Frango')).not.toBeInTheDocument()
  expect(screen.getByText('330 kcal · P 15 · C 30 · G 8')).toBeInTheDocument()
  expect(stored.meals[0].optionId).toBe('o2')
  expect(stored.meals[0].items.map((i) => i.id)).toEqual(['i3'])
})

test('Comi esta marca e fecha', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<Harness initial={dayFromMenu(menuA)} onClose={onClose} />)
  expect(screen.getByRole('button', { name: 'Refeição livre' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Comi esta' }))
  expect(stored.meals[0].done).toBe(true)
  expect(onClose).toHaveBeenCalled()
})

test('dia livre desabilita Comi esta', () => {
  render(<Harness initial={dayFromMenu(menuA)} dayFree />)
  expect(screen.getByRole('button', { name: 'Comi esta' })).toBeDisabled()
})

test('clicar na opção ativa não escreve nada', async () => {
  const user = userEvent.setup()
  const act = vi.fn()
  const day = skipItem(dayFromMenu(menuA), 'm1', 'i1', true)
  render(<MealScreen meal={day.meals[0]} menu={menuA} plan={plan} dayFree={false} act={act} onClose={() => {}} />)
  await user.click(screen.getByRole('radio', { name: 'A' }))
  expect(act).not.toHaveBeenCalled()
})

test('feita mostra Desmarcar', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<Harness initial={toggleMeal(dayFromMenu(menuA), 'm1')} onClose={onClose} />)
  expect(screen.queryByRole('button', { name: 'Comi esta' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Voltar' })).toHaveLength(2) // topo + barra de baixo
  await user.click(screen.getByRole('button', { name: 'Desmarcar' }))
  expect(stored.meals[0].done).toBe(false)
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Comi esta' })).toBeInTheDocument()
})

test('sem o cardápio do dia não mostra toggle', () => {
  render(<Harness initial={dayFromMenu(menuA)} noMenu />)
  expect(screen.queryByRole('radiogroup', { name: 'Opção' })).not.toBeInTheDocument()
  expect(screen.queryByText(/^Opção A/)).not.toBeInTheDocument()
  expect(screen.getByText('Frango')).toBeInTheDocument()
  expect(screen.getByText('Arroz')).toBeInTheDocument()
})

test('refeição livre desabilita o toggle e esconde ações de item', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<Harness initial={dayFromMenu(menuA)} onClose={onClose} />)
  expect(screen.getByRole('button', { name: /Frango/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Refeição livre' }))
  expect(stored.meals[0].free).toBe(true)
  expect(onClose).toHaveBeenCalled()
  expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'B' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: /Frango/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Adicionar extra' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Mais opções da refeição' }))
  await user.click(await screen.findByRole('button', { name: 'Desfazer refeição livre' }))
  expect(stored.meals[0].free).toBe(false)
  expect(screen.getByRole('radio', { name: 'A' })).toBeEnabled()
})

test('dia livre desabilita o toggle', () => {
  render(<Harness initial={dayFromMenu(menuA)} dayFree />)
  expect(screen.getByRole('radio', { name: 'B' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: /Frango/ })).not.toBeInTheDocument()
})

test('trocar por outro cardápio mostra "Voltar às opções" e volta pra A', async () => {
  const user = userEvent.setup()
  render(<Harness initial={dayFromMenu(menuA)} />)
  await user.click(screen.getByRole('radio', { name: 'B' }))
  await user.click(screen.getByRole('button', { name: 'Mais opções da refeição' }))
  await user.click(await screen.findByRole('button', { name: 'Trocar por refeição de outro cardápio' }))
  expect(await screen.findByRole('list', { name: 'Descanso' })).toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Dia de treino' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Jantar/ }))
  expect(stored.meals[0].swappedMeal).toBe('Descanso · Jantar')
  expect(stored.meals[0].optionId).toBeUndefined()
  expect(await screen.findByText('De outro cardápio: Descanso · Jantar')).toBeInTheDocument()
  expect(screen.getByText('Sopa')).toBeInTheDocument()
  expect(screen.queryByRole('radiogroup', { name: 'Opção' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Voltar às opções' }))
  expect(stored.meals[0].optionId).toBe('o1')
  expect(stored.meals[0].swappedMeal).toBeUndefined()
  expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
  expect(screen.getByText('Frango')).toBeInTheDocument()
})

test('item da IA mostra "estimativa da IA"', () => {
  const day = dayFromMenu(menuA)
  day.meals[0].items.push(it_('ia1', 'Bolo da vó', 350, 80, 'ia'))
  render(<Harness initial={day} />)
  expect(screen.getByText('Bolo da vó')).toBeInTheDocument()
  expect(screen.getByText('estimativa da IA')).toBeInTheDocument()
})

test('subtítulo do item: porção · gramas, ou só gramas', () => {
  const day = dayFromMenu(menuA)
  day.meals[0].items[0] = { ...day.meals[0].items[0], portion: '1 filé' }
  render(<Harness initial={day} />)
  expect(screen.getByText('1 filé · 150 g')).toBeInTheDocument()
  expect(screen.getByText('120 g')).toBeInTheDocument()
})
