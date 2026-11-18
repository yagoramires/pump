import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { renderLoaded } from '../../test/render'
import { load, resetStoreForTests, save } from '../storage/db'
import type { DietDay, DietItem, DietPlan, Menu } from './types'
import { dayFromMenu, setDayFree, toggleMeal } from './day'
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
const plan: DietPlan = { menus: [menuA, menuB], lastMenuId: 'A' }
const TODAY = '2026-11-18'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] }) // só o relógio; IndexedDB/findBy/user-event seguem com timers reais
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0))
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** abre o Almoço pelo armazenamento, como a aba faz; `day` = dia de hoje já mexido */
async function open({ day, dietPlan = plan, onClose = () => {} }: { day?: DietDay; dietPlan?: DietPlan; onClose?: () => void } = {}) {
  await save('dietPlan', dietPlan)
  if (day) await save('dietLog', { [TODAY]: day })
  resetStoreForTests()
  return renderLoaded(<MealScreen mealId="m1" onClose={onClose} />)
}
const stored = async () => (await load('dietLog'))?.[TODAY].meals[0]

test('toggle troca a opção e os itens', async () => {
  const user = userEvent.setup()
  await open()
  expect(screen.getByRole('heading', { name: 'Almoço · 12:30' })).toBeInTheDocument()
  expect(screen.getByRole('radiogroup', { name: 'Opção' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
  expect(screen.getByText('Opção A · Frango e arroz')).toBeInTheDocument()
  expect(screen.getByText('404 kcal · P 27 · C 54 · G 14')).toBeInTheDocument()

  await user.click(screen.getByRole('radio', { name: 'B' }))
  expect(screen.getByRole('radio', { name: 'B' })).toBeChecked()
  expect(await screen.findByText('Opção B')).toBeInTheDocument()
  expect(screen.getByText('Carne')).toBeInTheDocument()
  expect(screen.queryByText('Frango')).not.toBeInTheDocument()
  expect(screen.getByText('330 kcal · P 15 · C 30 · G 8')).toBeInTheDocument()
  await waitFor(async () => expect((await stored())?.optionId).toBe('o2'))
  expect((await stored())?.items.map((i) => i.id)).toEqual(['i3'])
})

test('Comi esta marca e fecha', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  await open({ onClose })
  expect(screen.getByRole('button', { name: 'Refeição livre' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Comi esta' }))
  expect(onClose).toHaveBeenCalled()
  await waitFor(async () => expect((await stored())?.done).toBe(true))
})

test('clicar na opção ativa não escreve nada', async () => {
  const user = userEvent.setup()
  await open()
  await user.click(screen.getByRole('radio', { name: 'A' }))
  expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
  expect(await load('dietLog')).toBeUndefined()
})

test('feita mostra Desmarcar', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  await open({ day: toggleMeal(dayFromMenu(menuA), 'm1'), onClose })
  expect(screen.queryByRole('button', { name: 'Comi esta' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Voltar' })).toHaveLength(2) // topo + barra de baixo
  await user.click(screen.getByRole('button', { name: 'Desmarcar' }))
  expect(await screen.findByRole('button', { name: 'Comi esta' })).toBeInTheDocument()
  expect(onClose).not.toHaveBeenCalled()
  expect((await stored())?.done).toBe(false)
})

test('sem o cardápio do dia não mostra toggle', async () => {
  await open({ day: toggleMeal(dayFromMenu(menuA), 'm1'), dietPlan: { menus: [menuB] } })
  expect(screen.queryByRole('radiogroup', { name: 'Opção' })).not.toBeInTheDocument()
  expect(screen.queryByText(/^Opção A/)).not.toBeInTheDocument()
  expect(screen.getByText('Frango')).toBeInTheDocument()
  expect(screen.getByText('Arroz')).toBeInTheDocument()
})

test('refeição livre desabilita o toggle e esconde ações de item', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  await open({ onClose })
  expect(screen.getByRole('button', { name: /Frango/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Refeição livre' }))
  expect(onClose).toHaveBeenCalled()
  await waitFor(() => expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled())
  expect((await stored())?.free).toBe(true)
  expect(screen.getByRole('radio', { name: 'B' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: /Frango/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Adicionar extra' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Mais opções da refeição' }))
  await user.click(await screen.findByRole('button', { name: 'Desfazer refeição livre' }))
  await waitFor(() => expect(screen.getByRole('radio', { name: 'A' })).toBeEnabled())
  expect((await stored())?.free).toBe(false)
})

test('dia livre desabilita o toggle, Comi esta e as ações de item', async () => {
  await open({ day: setDayFree(dayFromMenu(menuA), true) })
  expect(screen.getByRole('button', { name: 'Comi esta' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'B' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: /Frango/ })).not.toBeInTheDocument()
})

test('trocar por outro cardápio mostra "Voltar às opções" e volta pra A', async () => {
  const user = userEvent.setup()
  await open()
  await user.click(screen.getByRole('radio', { name: 'B' }))
  await screen.findByText('Carne')
  await user.click(screen.getByRole('button', { name: 'Mais opções da refeição' }))
  await user.click(await screen.findByRole('button', { name: 'Trocar por refeição de outro cardápio' }))
  expect(await screen.findByRole('list', { name: 'Descanso' })).toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Dia de treino' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Jantar/ }))
  expect(await screen.findByText('De outro cardápio: Descanso · Jantar')).toBeInTheDocument()
  expect((await stored())?.optionId).toBeUndefined()
  expect(screen.getByText('Sopa')).toBeInTheDocument()
  expect(screen.queryByRole('radiogroup', { name: 'Opção' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Voltar às opções' }))
  expect(await screen.findByText('Frango')).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
  expect(await stored()).toMatchObject({ optionId: 'o1' })
  expect((await stored())?.swappedMeal).toBeUndefined()
})

test('item da IA mostra "estimativa da IA"', async () => {
  const withIa = structuredClone(menuA)
  withIa.meals[0].options[0].items.push(it_('ia1', 'Bolo da vó', 350, 80, 'ia'))
  await open({ dietPlan: { menus: [withIa] } })
  expect(screen.getByText('Bolo da vó')).toBeInTheDocument()
  expect(screen.getByText('estimativa da IA')).toBeInTheDocument()
})

test('subtítulo do item: porção · gramas, ou só gramas', async () => {
  const withPortion = structuredClone(menuA)
  withPortion.meals[0].options[0].items[0].portion = '1 filé'
  await open({ dietPlan: { menus: [withPortion] } })
  expect(screen.getByText('1 filé · 150 g')).toBeInTheDocument()
  expect(screen.getByText('120 g')).toBeInTheDocument()
})
