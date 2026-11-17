import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import type { DietItem, DietPlan, Meal, Menu } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { dayFromMenu, toggleMeal } from './day'
import { DietTab } from './DietTab'

const it_ = (id: string, name: string, kcal: number, grams = 100): DietItem => ({ id, name, grams, per100: { kcal, p: 10, c: 20, f: 5 }, source: 'custom' })
const meal = (id: string, name: string, time: string, ...options: DietItem[][]): Meal => ({ id, name, time, options: options.map((items, o) => ({ id: `${id}-o${o}`, items })) })
const menuA: Menu = {
  id: 'A', name: 'Dia de treino', goalKcal: 2000, goalMacros: { p: 150, c: 200, f: 60 },
  meals: [
    meal('m2', 'Almoço', '12:00', [it_('i3', 'Arroz', 130, 200)]),
    meal('m1', 'Café', '07:00', [it_('i1', 'Pão', 300), it_('i2', 'Ovo', 150)], [it_('i4', 'Iogurte', 60, 200), it_('i5', 'Aveia', 380, 30)]),
  ],
}
const menuB: Menu = { id: 'B', name: 'Descanso', meals: [meal('mb', 'Único', '08:00', [it_('ib', 'Granola', 400)])] }
const plan: DietPlan = { menus: [menuA, menuB], lastMenuId: 'A' }
const TODAY = '2026-11-18'

const calorias = () => screen.getByRole('group', { name: 'Calorias' })
const openCafe = async (user: ReturnType<typeof userEvent.setup>) => user.click(await screen.findByRole('button', { name: /^Café/ }))

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] }) // só o relógio; IndexedDB/findBy/user-event seguem com timers reais
  vi.setSystemTime(new Date(2026, 10, 18, 9, 0)) // quarta
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('sem cardápio mostra o convite com os 3 caminhos', async () => {
  const user = userEvent.setup()
  render(<DietTab />)
  expect(await screen.findByRole('heading', { name: 'Monte seu cardápio' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Modelo/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Gerar com IA' }))
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: 'Importar' }))
  expect(await screen.findByRole('heading', { name: 'Importar cardápio' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: 'Do zero' }))
  expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Nome da refeição 1' })).toHaveValue('Refeição 1')
})

test('marcar refeição copia o dia e soma as kcal', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  expect(await screen.findByText('QUA, 18 NOV', { exact: false })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Dieta' })).toBeInTheDocument()
  // ordenadas por horário
  const names = within(screen.getByRole('list', { name: 'Refeições' })).getAllByRole('button', { name: /^(Café|Almoço)/ }).map((b) => b.textContent)
  expect(names[0]).toMatch(/^Café/)
  expect(calorias()).toHaveTextContent('0 / 2.000 kcal')
  expect(await load('dietLog')).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Marcar Café' }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.done).toBe(true))
  expect((await load('dietLog'))?.[TODAY].menuId).toBe('A')
  expect(calorias()).toHaveTextContent('450 / 2.000 kcal')
  expect(calorias()).toHaveTextContent('Proteína20/150 g')
})

test('trocar item só hoje não muda o cardápio', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await openCafe(user)
  await user.click(screen.getByRole('button', { name: /^Pão/ }))
  const drawer = await screen.findByRole('dialog')
  await user.click(await within(drawer).findByRole('button', { name: /Granola/ }))
  await user.click(within(drawer).getByRole('button', { name: 'Trocar' }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.items[0]).toMatchObject({ name: 'Granola', swappedFrom: 'Pão', grams: 100 }))
  expect(await load('dietPlan')).toEqual(plan)
  expect(await screen.findByText(/1 troca/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Desfazer troca de Granola' }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.items[0]).toEqual(menuA.meals[1].options[0].items[0]))
})

test('pular item tira as kcal e mostra Desfazer', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await user.click(await screen.findByRole('button', { name: 'Marcar Café' }))
  await openCafe(user)
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
  await user.click(screen.getByRole('button', { name: /^Pão/ }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Pular hoje' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('150 / 2.000 kcal'))
  expect(screen.getByText('Pão')).toHaveClass('line-through')
  await user.click(screen.getByRole('button', { name: 'Desfazer pular Pão' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
  expect((await load('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.items[0].skipped).toBe(false)
})

test('copos: tocar no vazio soma, no último cheio tira; link liga a água com a meta do peso', async () => {
  await save('dietPlan', plan)
  await save('profile', { sex: 'M', heightCm: 180, weightKg: 80 })
  await save('settings', { ...DEFAULT_SETTINGS, onboardingDone: true })
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await user.click(await screen.findByRole('button', { name: 'Ligar contador de água' }))
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: true, goalMl: 2750, cupMl: 250 }))
  expect((await load('settings'))?.onboardingDone).toBe(true)
  expect(await screen.findByText('Água · 0 de 2,8 L')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Adicionar copo' })).toHaveLength(11)
  await user.click(screen.getAllByRole('button', { name: 'Adicionar copo' })[5])
  await user.click(screen.getAllByRole('button', { name: 'Adicionar copo' })[0])
  await waitFor(async () => expect((await load('waterLog'))?.[TODAY]).toEqual({ ml: 500, goalMl: 2750 }))
  expect(screen.getByText('Água · 0,5 de 2,8 L')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tirar copo' }))
  await waitFor(async () => expect((await load('waterLog'))?.[TODAY].ml).toBe(250))
  expect(await load('dietLog')).toBeUndefined() // água não copia o dia
})

test('virada da meia-noite: ação depois da meia-noite vai pro dia novo', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 23, 59))
  const yesterday = toggleMeal(dayFromMenu(menuA), 'm1')
  await save('dietPlan', plan)
  await save('dietLog', { [TODAY]: yesterday })
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  expect(await screen.findByText('QUA, 18 NOV', { exact: false })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Marcar Café' })).toHaveAttribute('aria-pressed', 'true')
  vi.setSystemTime(new Date(2026, 10, 19, 0, 1))
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText('QUI, 19 NOV', { exact: false })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Marcar Café' })).toHaveAttribute('aria-pressed', 'false')
  await user.click(screen.getByRole('button', { name: 'Marcar Almoço' }))
  await waitFor(async () => expect((await load('dietLog'))?.['2026-11-19'].meals.find((m) => m.id === 'm2')?.done).toBe(true))
  expect((await load('dietLog'))?.[TODAY]).toEqual(yesterday)
})

test('virada da meia-noite sem visibilitychange: o toque já grava no dia novo', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 23, 59))
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  const almoco = await screen.findByRole('button', { name: 'Marcar Almoço' })
  vi.setSystemTime(new Date(2026, 10, 19, 0, 1))
  await user.click(almoco)
  await waitFor(async () => expect((await load('dietLog'))?.['2026-11-19'].meals.find((m) => m.id === 'm2')?.done).toBe(true))
  expect((await load('dietLog'))?.[TODAY]).toBeUndefined()
  expect(await screen.findByText('QUI, 19 NOV', { exact: false })).toBeInTheDocument()
})

test('trocar refeição pela opção B', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await openCafe(user)
  await user.click(screen.getByRole('button', { name: 'Trocar refeição' }))
  const drawer = await screen.findByRole('dialog')
  expect(within(within(drawer).getByRole('list', { name: 'Descanso' })).getByRole('button', { name: /Único/ })).toBeInTheDocument()
  await user.click(within(drawer).getByRole('button', { name: /Opção B/ }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')).toMatchObject({ swappedMeal: 'Opção B', items: [{ name: 'Iogurte' }, { name: 'Aveia' }] }))
  expect(await screen.findByRole('button', { name: /^Iogurte/ })).toBeInTheDocument()
})

test('refeição livre não soma', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await openCafe(user)
  expect(screen.getByRole('button', { name: 'Adicionar extra' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Refeição livre' }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')).toMatchObject({ done: true, free: true }))
  expect(calorias()).toHaveTextContent('0 / 2.000 kcal')
  expect(screen.queryByRole('button', { name: 'Adicionar extra' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Desfazer refeição livre' })).toBeInTheDocument()
})

test('dia livre esmaece e não soma', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await user.click(await screen.findByRole('button', { name: 'Marcar Café' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
  await user.click(screen.getByRole('button', { name: 'Dia livre' }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].free).toBe(true))
  expect(calorias()).toHaveTextContent('0 / 2.000 kcal')
  expect(screen.getByRole('list', { name: 'Refeições' })).toHaveClass('opacity-50')
  await user.click(screen.getByRole('button', { name: 'Desfazer dia livre' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
})

test('trocar cardápio com algo marcado pede confirmação', async () => {
  await save('dietPlan', plan)
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  // nada marcado: troca direto
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Cardápio de hoje' }), 'B')
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].menuId).toBe('B'))
  expect((await load('dietPlan'))?.lastMenuId).toBe('B')
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Marcar Único' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Cardápio de hoje' }), 'A')
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('O que você marcou hoje será apagado')
  expect((await load('dietLog'))?.[TODAY].menuId).toBe('B')
  await user.click(screen.getByRole('button', { name: 'Trocar' }))
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].menuId).toBe('A'))
  expect((await load('dietPlan'))?.lastMenuId).toBe('A')
  expect((await load('dietLog'))?.[TODAY].meals.every((m) => !m.done)).toBe(true)
})

test('item da IA mostra "estimativa da IA"; sem kcal mostra "sem valores"', async () => {
  const ia = (id: string, name: string, kcal: number): DietItem => ({ ...it_(id, name, kcal), source: 'ia' })
  await save('dietPlan', { menus: [{ id: 'A', name: 'Único', meals: [meal('m1', 'Café', '07:00', [ia('i1', 'Tapioca', 240), ia('i2', 'Chá de ervas', 0), it_('i3', 'Pão', 300)])] }], lastMenuId: 'A' })
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  await openCafe(user)
  expect(screen.getByText('Tapioca').parentElement).toHaveTextContent('estimativa da IA')
  expect(screen.getByText('Chá de ervas').parentElement).toHaveTextContent('sem valores')
  expect(screen.getByText('Pão').parentElement).not.toHaveTextContent(/estimativa da IA|sem valores/)
})

test('cópia de hoje com cardápio que saiu do plano: o select mostra o nome e trocar funciona', async () => {
  await save('dietPlan', plan)
  await save('dietLog', { [TODAY]: dayFromMenu({ ...menuB, id: 'old', name: 'Antigo' }) })
  resetStoreForTests()
  const user = userEvent.setup()
  render(<DietTab />)
  const select = await screen.findByRole('combobox', { name: 'Cardápio de hoje' })
  expect(select).toHaveDisplayValue('Antigo')
  expect(screen.getByRole('option', { name: 'Antigo' })).toBeDisabled()
  await user.selectOptions(select, 'A')
  await waitFor(async () => expect((await load('dietLog'))?.[TODAY].menuId).toBe('A'))
})
