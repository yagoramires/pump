import type { DayItem, DietItem, DietPlan } from './types'
import { screen, waitFor, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { FoodPicker } from './FoodPicker'

const food = (name: string, kcal = 100): DietItem => ({ id: `id-${name}`, name, grams: 50, per100: { kcal, p: 10, c: 5, f: 2 }, source: 'custom' })
const planWith = (items: DietItem[]): DietPlan => ({
  menus: [{ id: 'A', name: 'Treino', meals: [{ id: 'm1', name: 'Almoço', time: '12:00', options: [{ id: 'o1', items: [] }, { id: 'o2', items }] }] }],
})
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayKey(d)
}
const dayWith = (items: DayItem[]) => ({ menuId: 'A', menuName: 'Treino', meals: [{ id: 'm1', name: 'Almoço', time: '12:00', done: true, items }] })

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
afterEach(() => vi.unstubAllGlobals())

test('FoodPicker offline mostra recentes e aviso; escolher devolve item com gramas', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await save('foods', [food('Meu shake', 120)])
  await save('dietPlan', planWith([food('Arroz')]))
  await save('dietLog', { [daysAgo(1)]: dayWith([{ ...food('Arroz'), skipped: true }, food('Feijão')]), [daysAgo(20)]: dayWith([food('Coisa velha')]) })
  resetStoreForTests()
  const onPick = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<FoodPicker title="Adicionar · Almoço" confirmLabel="Usar" onPick={onPick} onClose={vi.fn()} />)
  expect(await screen.findByText('Sem internet para buscar na TACO')).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: /Meu shake/ })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Arroz/ })).toHaveLength(1)
  expect(screen.getByRole('button', { name: /Feijão/ })).toBeInTheDocument()
  expect(screen.queryByText('Coisa velha')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Usar' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: /Meu shake/ }))
  await user.click(screen.getByRole('button', { name: 'Usar' }))
  expect(onPick).toHaveBeenCalledWith({ id: expect.any(String), name: 'Meu shake', grams: 100, per100: { kcal: 120, p: 10, c: 5, f: 2 }, source: 'custom' })
  expect(onPick.mock.calls[0][0].id).not.toBe('id-Meu shake')
})

test('FoodPicker cria alimento próprio e grava em foods', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  const onPick = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<FoodPicker title="Adicionar" confirmLabel="Adicionar" onPick={onPick} onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Criar alimento próprio' }))
  await user.type(screen.getByRole('textbox', { name: 'Nome do alimento' }), 'Pasta de amendoim')
  await user.type(screen.getByRole('textbox', { name: 'kcal por 100 g' }), '588')
  await user.type(screen.getByRole('textbox', { name: 'Proteína por 100 g' }), '25,5')
  await user.type(screen.getByRole('textbox', { name: 'Gordura por 100 g' }), '50')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  await waitFor(async () =>
    expect(await load('foods')).toEqual([{ id: expect.any(String), name: 'Pasta de amendoim', grams: 100, per100: { kcal: 588, p: 25.5, c: 0, f: 50 }, source: 'custom' }]),
  )
  // volta pra lista com o alimento novo escolhido
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pasta de amendoim', grams: 100, source: 'custom' }))
  // mesmo nome (sem acento/caixa) não cria outro
  await user.click(screen.getByRole('button', { name: 'Criar alimento próprio' }))
  const name = screen.getByRole('textbox', { name: 'Nome do alimento' })
  await user.clear(name)
  await user.type(name, 'pasta de AMENDOIM ')
  expect(screen.getByRole('alert')).toHaveTextContent('Já existe um alimento com esse nome')
  expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled()
})

test('FoodPicker busca na TACO e mostra a fonte', async () => {
  const taco = [
    { id: 1, name: 'Arroz, tipo 1, cozido', kcal: 128, p: 2.5, c: 28.1, f: 0.2 },
    { id: 2, name: 'Feijão, carioca, cozido', kcal: 76, p: 4.8, c: 13.6, f: 0.5 },
  ]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => taco }))
  const onPick = vi.fn()
  const onSkip = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<FoodPicker title="Trocar · Frango" initialGrams={150} confirmLabel="Trocar" onPick={onPick} onClose={vi.fn()} extraAction={{ label: 'Pular hoje', onClick: onSkip }} />)
  expect(screen.getByText(/TACO 4ª ed\./)).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox', { name: 'Buscar alimento' }), 'arroz')
  const results = await screen.findByRole('list', { name: 'Resultados da TACO' })
  expect(within(results).getAllByRole('button')).toHaveLength(1)
  await user.click(within(results).getByRole('button', { name: /Arroz, tipo 1, cozido/ }))
  await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
  expect(screen.getByText('160 g')).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Porção' }), '4 col')
  await user.click(screen.getByRole('button', { name: 'Trocar' }))
  expect(onPick).toHaveBeenCalledWith({ id: expect.any(String), name: 'Arroz, tipo 1, cozido', grams: 160, portion: '4 col', per100: { kcal: 128, p: 2.5, c: 28.1, f: 0.2 }, source: 'taco', tacoId: 1 })
  await user.click(screen.getByRole('button', { name: 'Pular hoje' }))
  expect(onSkip).toHaveBeenCalled()
})

test('FoodPicker não cria alimento que o import trataria como o mesmo (B5)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await save('foods', [food('Bolo, da vó')])
  resetStoreForTests()
  const user = userEvent.setup()
  await renderLoaded(<FoodPicker title="Adicionar" confirmLabel="Adicionar" onPick={vi.fn()} onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Criar alimento próprio' }))
  await user.type(screen.getByRole('textbox', { name: 'Nome do alimento' }), 'Bolo da vó')
  expect(screen.getByRole('alert')).toHaveTextContent('Já existe um alimento com esse nome')
  expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled()
})
