import { DEFAULTS } from '../schema'
import type { DietItem, DietPlan } from './types'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '../storage/db'
import { DietEditor } from './DietEditor'

const shake: DietItem = { id: 'f1', name: 'Meu shake', grams: 100, per100: { kcal: 120, p: 20, c: 5, f: 2 }, source: 'custom' }
const pao: DietItem = { id: 'i1', name: 'Pão francês', grams: 50, portion: '1 un', per100: { kcal: 300, p: 8, c: 58, f: 3 }, source: 'taco', tacoId: 9 }
const plan = (time = '07:00'): DietPlan => ({
  menus: [
    { id: 'A', name: 'Dia de treino', goalKcal: 2000, meals: [{ id: 'm1', name: 'Café', time, options: [{ id: 'o1', items: [pao] }] }] },
    { id: 'B', name: 'Descanso', meals: [{ id: 'm2', name: 'Almoço', time: '12:00', options: [{ id: 'o2', items: [shake] }] }] },
  ],
  lastMenuId: 'B',
})
// sem a pausa entre eventos do user-event: o editor não tem timer, e os fluxos longos ficavam perto do timeout de 5 s
const setup = () => userEvent.setup({ delay: null })
const saved = (onSave: ReturnType<typeof vi.fn>): DietPlan => onSave.mock.calls[0][0]

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => vi.unstubAllGlobals())

test('do zero abre com uma refeição; Salvar entrega o plano e Apagar todos entrega o plano vazio', async () => {
  await save('foods', [shake])
  resetStoreForTests()
  const onSave = vi.fn()
  const user = setup()
  const { unmount } = await renderLoaded(<DietEditor initial={DEFAULTS.dietPlan} onSave={onSave} onCancel={vi.fn()} />)
  const name = await screen.findByRole('textbox', { name: 'Nome da refeição 1' })
  expect(name).toHaveValue('Refeição 1')
  await user.clear(name)
  await user.type(name, 'Café da manhã')
  fireEvent.change(screen.getByLabelText('Horário da refeição 1'), { target: { value: '07:00' } })
  await user.click(screen.getByRole('button', { name: 'Alimento' }))
  await user.click(await screen.findByRole('button', { name: /Meu shake/ }))
  await user.click(screen.getByRole('button', { name: 'Usar' }))
  expect(await screen.findByText('Meu shake')).toBeInTheDocument()
  expect(screen.getAllByText('120 kcal')).toHaveLength(2) // item e total da opção
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(onSave).toHaveBeenCalledTimes(1)
  expect(saved(onSave).menus).toHaveLength(1)
  const meal = saved(onSave).menus[0].meals[0]
  expect(meal).toMatchObject({ name: 'Café da manhã', time: '07:00' })
  expect(meal.options[0].items).toEqual([expect.objectContaining({ name: 'Meu shake', grams: 100, source: 'custom' })])

  unmount()
  onSave.mockClear()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Apagar todos os cardápios' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  expect(onSave).toHaveBeenCalledWith(DEFAULTS.dietPlan)
})

test('DietEditor exige horário HH:MM pra salvar', async () => {
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan('')} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: preencha nome e horário (HH:MM) de cada refeição')
  expect(onSave).not.toHaveBeenCalled()
  // abriu no Descanso (lastMenuId) e pulou pro cardápio com o problema
  expect(screen.getByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Dia de treino')
  fireEvent.change(screen.getByLabelText('Horário da refeição 1'), { target: { value: '07:30' } })
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).menus[0].meals[0].time).toBe('07:30')
})

test('DietEditor duplica e apaga cardápios e edita opções', async () => {
  await save('foods', [shake])
  resetStoreForTests()
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  // abre no último cardápio usado
  expect(await screen.findByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Descanso')
  await user.click(screen.getByRole('button', { name: 'Dia de treino' }))
  await user.click(screen.getByRole('button', { name: 'Duplicar cardápio' }))
  expect(screen.getByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Dia de treino (cópia)')
  expect(screen.getByText('Pão francês')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Adicionar opção na refeição 1' }))
  expect(screen.getByRole('button', { name: 'Opção B' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByText('Pão francês')).not.toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Nome da opção da refeição 1' }), 'Iogurte')
  await user.click(screen.getByRole('button', { name: 'Alimento' }))
  await user.click(await screen.findByRole('button', { name: /Meu shake/ }))
  await user.click(screen.getByRole('button', { name: 'Usar' }))
  await user.click(screen.getByRole('button', { name: 'Opção A' }))
  expect(screen.getByText('Pão francês')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Descanso' }))
  await user.click(screen.getByRole('button', { name: 'Apagar cardápio' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Descanso' })).not.toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  const out = saved(onSave)
  expect(out.menus.map((m) => m.name)).toEqual(['Dia de treino', 'Dia de treino (cópia)'])
  const copy = out.menus[1]
  expect(copy.id).not.toBe('A')
  expect(copy.meals[0].id).not.toBe('m1')
  expect(copy.meals[0].options.map((o) => o.name)).toEqual([undefined, 'Iogurte'])
  expect(copy.meals[0].options[0].items[0]).toMatchObject({ name: 'Pão francês', grams: 50 })
  expect(copy.meals[0].options[0].items[0].id).not.toBe('i1')
  expect(copy.meals[0].options[1].items.map((i) => i.name)).toEqual(['Meu shake'])
  expect(out.menus[0].meals[0].options).toHaveLength(1)
})

test('DietEditor não apaga o último cardápio', async () => {
  await renderLoaded(<DietEditor initial={{ menus: [plan().menus[0]] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Apagar cardápio' })).toBeDisabled()
})

test('DietEditor recusa opção vazia e meta fora da faixa; Salvar apara os textos', async () => {
  const onSave = vi.fn()
  const user = setup()
  const initial: DietPlan = {
    menus: [{
      id: 'A', name: ' Dia de treino ', goalKcal: 500,
      meals: [{ id: 'm1', name: ' Café ', time: '07:00', options: [{ id: 'o1', name: '  ', items: [{ ...pao, portion: ' 1 un ' }] }, { id: 'o2', items: [] }] }],
    }],
  }
  await renderLoaded(<DietEditor initial={initial} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: cada opção precisa de ao menos 1 alimento')
  await user.click(screen.getByRole('button', { name: 'Opção B' }))
  await user.click(screen.getByRole('button', { name: 'Remover opção B da refeição 1' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: meta fora da faixa (800 a 6000 kcal)')
  expect(onSave).not.toHaveBeenCalled()
  const kcal = screen.getByRole('textbox', { name: 'Meta diária em kcal' })
  await user.clear(kcal)
  await user.type(kcal, '2100')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  const menu = saved(onSave).menus[0]
  expect(menu).toMatchObject({ name: 'Dia de treino', goalKcal: 2100 })
  expect(menu.meals[0].name).toBe('Café')
  expect(menu.meals[0].options).toHaveLength(1)
  expect(menu.meals[0].options[0].name).toBeUndefined()
  expect(menu.meals[0].options[0].items[0].portion).toBe('1 un')
})

test('DietEditor trava novos cardápios no limite do formato', async () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ ...plan().menus[0], id: `M${i}`, name: `C${i}` }))
  await renderLoaded(<DietEditor initial={{ menus: five }} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Novo cardápio' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Duplicar cardápio' })).toBeDisabled()
})

test('DietEditor recusa meta de macro acima de 600 g', async () => {
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Dia de treino' }))
  await user.type(screen.getByRole('textbox', { name: 'Meta de proteína em g' }), '700')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: macros fora da faixa (0 a 600 g)')
  expect(onSave).not.toHaveBeenCalled()
})
