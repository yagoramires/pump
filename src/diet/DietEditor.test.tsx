import { DEFAULTS } from '../schema'
import type { DietItem, DietPlan } from './types'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import { todayKey } from '../lib/date'
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

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => vi.unstubAllGlobals())

test('DietEditor salva refeição com horário e item; Apagar cardápio volta a vazio', async () => {
  await save('foods', [shake])
  resetStoreForTests()
  const onDone = vi.fn()
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<DietEditor onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Refeição' }))
  const name = screen.getByRole('textbox', { name: 'Nome da refeição 1' })
  await user.clear(name)
  await user.type(name, 'Café da manhã')
  fireEvent.change(screen.getByLabelText('Horário da refeição 1'), { target: { value: '07:00' } })
  await user.click(screen.getByRole('button', { name: 'Alimento' }))
  await user.click(await screen.findByRole('button', { name: /Meu shake/ }))
  await user.click(screen.getByRole('button', { name: 'Usar' }))
  expect(await screen.findByText('Meu shake')).toBeInTheDocument()
  expect(screen.getAllByText('120 kcal')).toHaveLength(2) // item e total da opção
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())

  const saved = await load('dietPlan')
  expect(saved?.menus).toHaveLength(1)
  expect(saved?.lastMenuId).toBe(saved?.menus[0].id)
  const meal = saved!.menus[0].meals[0]
  expect(meal).toMatchObject({ name: 'Café da manhã', time: '07:00' })
  expect(meal.options[0].items).toEqual([expect.objectContaining({ name: 'Meu shake', grams: 100, source: 'custom' })])
  await waitFor(async () => expect((await load('dietLog'))?.[todayKey()]?.meals.map((m) => m.name)).toEqual(['Café da manhã']))

  unmount()
  await renderLoaded(<DietEditor onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Apagar todos os cardápios' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await load('dietPlan')).toEqual(DEFAULTS.dietPlan))
  expect((await load('dietLog'))?.[todayKey()]).toBeDefined()
})

test('DietEditor exige horário HH:MM pra salvar', async () => {
  const onDone = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<DietEditor initial={plan('')} onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: preencha nome e horário (HH:MM) de cada refeição')
  expect(onDone).not.toHaveBeenCalled()
  expect(await load('dietPlan')).toBeUndefined()
  // abriu no Descanso (lastMenuId) e pulou pro cardápio com o problema
  expect(screen.getByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Dia de treino')
  fireEvent.change(screen.getByLabelText('Horário da refeição 1'), { target: { value: '07:30' } })
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
})

test('DietEditor duplica e apaga cardápios, edita opções e mantém lastMenuId válido', async () => {
  await save('foods', [shake])
  resetStoreForTests()
  const user = userEvent.setup()
  await renderLoaded(<DietEditor initial={plan()} onDone={vi.fn()} onCancel={vi.fn()} />)
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

  await waitFor(async () => expect((await load('dietPlan'))?.menus.map((m) => m.name)).toEqual(['Dia de treino', 'Dia de treino (cópia)']))
  const saved = (await load('dietPlan'))!
  expect(saved.lastMenuId).toBe('A')
  const copy = saved.menus[1]
  expect(copy.id).not.toBe('A')
  expect(copy.meals[0].id).not.toBe('m1')
  expect(copy.meals[0].options.map((o) => o.name)).toEqual([undefined, 'Iogurte'])
  expect(copy.meals[0].options[0].items[0]).toMatchObject({ name: 'Pão francês', grams: 50 })
  expect(copy.meals[0].options[0].items[0].id).not.toBe('i1')
  expect(copy.meals[0].options[1].items.map((i) => i.name)).toEqual(['Meu shake'])
  expect(saved.menus[0].meals[0].options).toHaveLength(1)
})

test('DietEditor não apaga o último cardápio', async () => {
  await renderLoaded(<DietEditor initial={{ menus: [plan().menus[0]] }} onDone={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Apagar cardápio' })).toBeDisabled()
})

test('DietEditor recusa opção vazia e meta fora da faixa; Salvar apara os textos', async () => {
  const onDone = vi.fn()
  const user = userEvent.setup()
  const initial: DietPlan = {
    menus: [{
      id: 'A', name: ' Dia de treino ', goalKcal: 500,
      meals: [{ id: 'm1', name: ' Café ', time: '07:00', options: [{ id: 'o1', name: '  ', items: [{ ...pao, portion: ' 1 un ' }] }, { id: 'o2', items: [] }] }],
    }],
  }
  await renderLoaded(<DietEditor initial={initial} onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: cada opção precisa de ao menos 1 alimento')
  await user.click(screen.getByRole('button', { name: 'Opção B' }))
  await user.click(screen.getByRole('button', { name: 'Remover opção B da refeição 1' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: meta fora da faixa (800 a 6000 kcal)')
  expect(onDone).not.toHaveBeenCalled()
  const kcal = screen.getByRole('textbox', { name: 'Meta diária em kcal' })
  await user.clear(kcal)
  await user.type(kcal, '2100')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  const menu = (await load('dietPlan'))!.menus[0]
  expect(menu).toMatchObject({ name: 'Dia de treino', goalKcal: 2100 })
  expect(menu.meals[0].name).toBe('Café')
  expect(menu.meals[0].options).toHaveLength(1)
  expect(menu.meals[0].options[0].name).toBeUndefined()
  expect(menu.meals[0].options[0].items[0].portion).toBe('1 un')
})

test('DietEditor trava novos cardápios no limite do formato', async () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ ...plan().menus[0], id: `M${i}`, name: `C${i}` }))
  await renderLoaded(<DietEditor initial={{ menus: five }} onDone={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Novo cardápio' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Duplicar cardápio' })).toBeDisabled()
})

test('DietEditor recusa meta de macro acima de 600 g', async () => {
  const onDone = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<DietEditor initial={plan()} onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Dia de treino' }))
  await user.type(screen.getByRole('textbox', { name: 'Meta de proteína em g' }), '700')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: macros fora da faixa (0 a 600 g)')
  expect(onDone).not.toHaveBeenCalled()
})

test('DietEditor com confirmReplace pede confirmação antes de substituir o cardápio salvo', async () => {
  await save('dietPlan', { menus: [{ id: 'X', name: 'Antigo', meals: [] }], lastMenuId: 'X' })
  resetStoreForTests()
  const onDone = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<DietEditor initial={plan()} confirmReplace onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('O cardápio atual será substituído. O que você já marcou hoje continua.')
  expect((await load('dietPlan'))?.menus[0].id).toBe('X')
  expect(onDone).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Substituir' }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  expect((await load('dietPlan'))?.menus.map((m) => m.id)).toEqual(['A', 'B'])
})

test('DietEditor com confirmReplace e nada salvo salva direto', async () => {
  const onDone = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<DietEditor initial={plan()} confirmReplace onDone={onDone} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
})
