import { act, screen, waitFor, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import userEvent from '@testing-library/user-event'
import { save } from '@/storage/db'
import { DEFAULTS } from '@/schema'
import type { DietItem, DietPlan, Meal, Menu } from './types'
import { chooseOption, dayFromMenu, toggleMeal } from './day'
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
const list = () => screen.getByRole('list', { name: 'Refeições' })
const row = (name: string) => within(list()).getByText(name).closest('li')!
const openMeal = async (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(within(await screen.findByRole('list', { name: 'Refeições' })).getByText(name))
const back = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getAllByRole('button', { name: 'Voltar' })[0])
const more = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Mais opções da dieta' }))
  return screen.findByRole('dialog')
}

beforeEach(async () => {
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
  await renderLoaded(<DietTab />)
  expect(await screen.findByRole('heading', { name: 'Monte seu cardápio' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Gerar com IA' }))
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: 'Converter' }))
  expect(await screen.findByRole('heading', { name: 'Converter dieta' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: 'Do zero' }))
  expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Nome da refeição 1' })).toHaveValue('Refeição 1')
})

test('Do zero: salvar sem cardápio resultante fecha o editor e volta ao convite', async () => {
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('button', { name: 'Do zero' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar todos os cardápios' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  expect(await screen.findByRole('heading', { name: 'Monte seu cardápio' })).toBeInTheDocument()
})

test('marcar refeição copia o dia e soma as kcal', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  expect(await screen.findByText('Qua, 18 nov · Dia de treino')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Dieta' })).toBeInTheDocument()
  expect(calorias()).toHaveTextContent('0 / 2.000 kcal')
  for (const m of ['P 0/150', 'C 0/200', 'G 0/60']) expect(within(calorias()).getByText(m)).toBeInTheDocument()
  expect(within(calorias()).getByRole('img', { name: '0% da meta' })).toBeInTheDocument()
  expect(await stored('dietLog')).toBeUndefined()
  await user.click(screen.getByRole('checkbox', { name: 'Café feita' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.done).toBe(true))
  expect((await stored('dietLog'))?.[TODAY].menuId).toBe('A')
  expect(calorias()).toHaveTextContent('450 / 2.000 kcal')
  expect(calorias()).toHaveTextContent('P 20/150')
  expect(within(calorias()).getByRole('img', { name: '23% da meta' })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Café feita' })).toBeChecked()
})

test('sem meta: só as kcal feitas, sem anel', async () => {
  await seedStore({ dietPlan: { menus: [menuB], lastMenuId: 'B' } })
  await renderLoaded(<DietTab />)
  expect(await screen.findByText('Qua, 18 nov · Descanso')).toBeInTheDocument()
  expect(calorias()).toHaveTextContent('0 kcal')
  expect(calorias()).not.toHaveTextContent('/')
  expect(within(calorias()).queryByRole('img')).not.toBeInTheDocument()
})

test('lista mostra horário, nome e opções; tocar abre a refeição', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await screen.findByRole('list', { name: 'Refeições' })
  expect(within(list()).getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringMatching(/^07:00Café2 opções/), expect.stringMatching(/^12:00Almoço260 kcal/)])
  await openMeal(user, 'Café')
  expect(screen.getByRole('heading', { name: 'Café · 07:00' })).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'B' }))
  expect(await screen.findByText('Iogurte')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Comi esta' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')).toMatchObject({ done: true, optionId: 'm1-o1' }))
  expect(row('Café')).toHaveTextContent('234 kcal')
  expect(within(row('Café')).getByText('B')).toBeInTheDocument()
  expect(calorias()).toHaveTextContent('234 / 2.000 kcal')
})

test('refeição aberta que some do dia fecha e não reabre quando volta', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await openMeal(user, 'Café')
  await act(() => save('dietLog', { [TODAY]: toggleMeal(dayFromMenu(menuB), 'mb') }))
  expect(await screen.findByRole('list', { name: 'Refeições' })).toHaveTextContent('Único')
  await act(() => save('dietLog', { [TODAY]: toggleMeal(dayFromMenu(menuA), 'm2') }))
  expect(await screen.findByRole('list', { name: 'Refeições' })).toHaveTextContent('Café')
  expect(screen.queryByRole('heading', { name: 'Café · 07:00' })).not.toBeInTheDocument()
})

test('check da lista marca com a opção escolhida (B)', async () => {
  await seedStore({ dietPlan: plan, dietLog: { [TODAY]: chooseOption(dayFromMenu(menuA), 'm1', menuA.meals[1].options[1]) } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Café feita' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')).toMatchObject({ done: true, optionId: 'm1-o1', items: [{ name: 'Iogurte' }, { name: 'Aveia' }] }))
  expect(within(row('Café')).getByText('B')).toBeInTheDocument()
  expect(row('Café')).toHaveTextContent('234 kcal')
  await user.click(screen.getByRole('checkbox', { name: 'Café feita' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.done).toBe(false))
  expect(row('Café')).toHaveTextContent('2 opções')
})

test('refeição do horário atual destacada', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 11, 0))
  const menuC: Menu = { id: 'C', name: 'Único', meals: [meal('c1', 'Café', '07:00', [it_('x1', 'Pão', 300)]), meal('c2', 'Lanche', '10:00', [it_('x2', 'Fruta', 50)]), meal('c3', 'Almoço', '12:00', [it_('x3', 'Arroz', 130)])] }
  await seedStore({ dietPlan: { menus: [menuC], lastMenuId: 'C' }, dietLog: { [TODAY]: toggleMeal(dayFromMenu(menuC), 'c1') } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await screen.findByRole('list', { name: 'Refeições' })
  expect(row('Lanche')).toHaveAttribute('aria-current', 'true')
  expect(row('Café')).not.toHaveAttribute('aria-current')
  expect(row('Almoço')).not.toHaveAttribute('aria-current')
  const drawer = await more(user)
  expect(within(drawer).queryByRole('button', { name: 'Cardápio de hoje' })).not.toBeInTheDocument()
  expect(within(drawer).getByRole('button', { name: 'Dia livre' })).toBeInTheDocument()
})

test('pílula de água abre a barra; água desligada mostra o link', async () => {
  await seedStore({
    dietPlan: plan,
    profile: { sex: 'M', heightCm: 180 },
    measurements: [{ id: 'm', date: '2026-11-17', weightKg: 80 }],
    settings: { ...DEFAULTS.settings, onboardingDone: true },
  })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await screen.findByRole('list', { name: 'Refeições' })
  expect(screen.queryByRole('button', { name: /^Água/ })).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Ligar contador de água' }))
  await waitFor(async () => expect((await stored('settings'))?.water).toEqual({ enabled: true, goalMl: 2750 }))
  expect((await stored('settings'))?.onboardingDone).toBe(true)
  const pill = await screen.findByRole('button', { name: 'Água: 0 de 2,8 litros' })
  expect(pill).toHaveTextContent('0/2,8 L')
  expect(screen.queryByRole('button', { name: 'Ligar contador de água' })).not.toBeInTheDocument()
  await user.click(pill)
  const drawer = await screen.findByRole('dialog')
  expect(within(drawer).getByText('Água · 0 de 2,8 L')).toBeInTheDocument()
  const slider = within(drawer).getByRole('slider', { name: 'Água de hoje' })
  slider.focus()
  await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
  await waitFor(async () => expect((await stored('waterLog'))?.[TODAY]).toEqual({ ml: 300, goalMl: 2750 }))
  expect(slider).toHaveAttribute('aria-valuetext', '0,3 L')
  await user.keyboard('{Escape}')
  expect(await screen.findByRole('button', { name: 'Água: 0,3 de 2,8 litros' })).toHaveTextContent('0,3/2,8 L')
  expect(await stored('dietLog')).toBeUndefined()
})

test('com a meta batida o máximo da barra passa de meta + 500', async () => {
  await seedStore({ dietPlan: plan, settings: { ...DEFAULTS.settings, water: { enabled: true, goalMl: 2000 } }, waterLog: { [TODAY]: { ml: 2000, goalMl: 2000 } } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('button', { name: /^Água/ }))
  expect(within(await screen.findByRole('dialog')).getByRole('slider', { name: 'Água de hoje' })).toHaveAttribute('aria-valuemax', '2500')
})

test('menu ⋯: dia livre e trocar cardápio com confirmação', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Café feita' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
  await user.click(within(await more(user)).getByRole('button', { name: 'Dia livre' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('Dia livre'))
  expect(calorias()).toHaveTextContent('0 / 2.000 kcal')
  expect(screen.getByRole('checkbox', { name: 'Café feita' })).toBeDisabled()
  await user.click(within(await more(user)).getByRole('button', { name: 'Desfazer dia livre' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
  await user.click(screen.getByRole('checkbox', { name: 'Café feita' }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Café feita' })).not.toBeChecked())

  await user.click(within(await more(user)).getByRole('button', { name: 'Cardápio de hoje' }))
  let menus = await screen.findByRole('list', { name: 'Cardápios' })
  expect(within(menus).getByRole('button', { name: 'Dia de treino' })).toHaveAttribute('aria-current', 'true')
  await user.click(within(menus).getByRole('button', { name: 'Descanso' }))
  await waitFor(async () => expect((await stored('dietPlan'))?.lastMenuId).toBe('B'))
  expect((await stored('dietLog'))?.[TODAY]).toBeUndefined() // dia sem marca não é dado: segue o cardápio
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(await screen.findByText('Qua, 18 nov · Descanso')).toBeInTheDocument()

  await user.click(await screen.findByRole('checkbox', { name: 'Único feita' }))
  await user.click(within(await more(user)).getByRole('button', { name: 'Cardápio de hoje' }))
  menus = await screen.findByRole('list', { name: 'Cardápios' })
  await user.click(within(menus).getByRole('button', { name: 'Dia de treino' }))
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('O que você marcou hoje será apagado')
  expect((await stored('dietLog'))?.[TODAY].menuId).toBe('B')
  await user.click(screen.getByRole('button', { name: 'Trocar' }))
  await waitFor(async () => expect((await stored('dietPlan'))?.lastMenuId).toBe('A'))
  expect((await stored('dietLog'))?.[TODAY]).toBeUndefined()
  expect(await screen.findByRole('checkbox', { name: 'Café feita' })).not.toBeChecked()

  await user.click(within(await more(user)).getByRole('button', { name: 'Editar cardápio' }))
  expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument()
})

test('trocar item só hoje não muda o cardápio', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await openMeal(user, 'Café')
  await user.click(screen.getByRole('button', { name: /^Pão/ }))
  const drawer = await screen.findByRole('dialog')
  await user.click(await within(drawer).findByRole('button', { name: /Granola/ }))
  await user.click(within(drawer).getByRole('button', { name: 'Trocar' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.items[0]).toMatchObject({ name: 'Granola', swappedFrom: 'Pão', grams: 100 }))
  expect(await stored('dietPlan')).toEqual(plan)
  await user.click(await screen.findByRole('button', { name: 'Desfazer troca de Granola' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY].meals.find((m) => m.id === 'm1')?.items[0]).toEqual(menuA.meals[1].options[0].items[0]))
})

test('pular item tira as kcal e mostra Desfazer', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Café feita' }))
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
  await openMeal(user, 'Café')
  await user.click(screen.getByRole('button', { name: /^Pão/ }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Pular hoje' }))
  await screen.findByRole('button', { name: 'Desfazer pular Pão' })
  await back(user)
  await waitFor(() => expect(calorias()).toHaveTextContent('150 / 2.000 kcal'))
  await openMeal(user, 'Café')
  await user.click(screen.getByRole('button', { name: 'Desfazer pular Pão' }))
  await back(user)
  await waitFor(() => expect(calorias()).toHaveTextContent('450 / 2.000 kcal'))
})

test('refeição livre não soma', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await openMeal(user, 'Café')
  await user.click(screen.getByRole('button', { name: 'Refeição livre' }))
  await waitFor(() => expect(row('Café')).toHaveTextContent('livre'))
  expect(calorias()).toHaveTextContent('0 / 2.000 kcal')
  expect(screen.getByRole('checkbox', { name: 'Café feita' })).toBeChecked()
  await user.click(screen.getByRole('checkbox', { name: 'Café feita' }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Café feita' })).not.toBeChecked())
  expect(row('Café')).not.toHaveTextContent('livre')
})

test('virada da meia-noite: ação depois da meia-noite vai pro dia novo', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 23, 59))
  const yesterday = toggleMeal(dayFromMenu(menuA), 'm1')
  await seedStore({ dietPlan: plan, dietLog: { [TODAY]: yesterday } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  expect(await screen.findByText('Qua, 18 nov', { exact: false })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Café feita' })).toBeChecked()
  vi.setSystemTime(new Date(2026, 10, 19, 0, 1))
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText('Qui, 19 nov', { exact: false })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Café feita' })).not.toBeChecked()
  await user.click(screen.getByRole('checkbox', { name: 'Almoço feita' }))
  await waitFor(async () => expect((await stored('dietLog'))?.['2026-11-19'].meals.find((m) => m.id === 'm2')?.done).toBe(true))
  expect((await stored('dietLog'))?.[TODAY]).toEqual(yesterday)
})

test('virada da meia-noite sem visibilitychange: o toque já grava no dia novo', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 23, 59))
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  const almoco = await screen.findByRole('checkbox', { name: 'Almoço feita' })
  vi.setSystemTime(new Date(2026, 10, 19, 0, 1))
  await user.click(almoco)
  await waitFor(async () => expect((await stored('dietLog'))?.['2026-11-19'].meals.find((m) => m.id === 'm2')?.done).toBe(true))
  expect((await stored('dietLog'))?.[TODAY]).toBeUndefined()
  expect(await screen.findByText('Qui, 19 nov', { exact: false })).toBeInTheDocument()
})

test('dia marcado com cardápio que saiu do plano: a lista mostra o nome desabilitado e trocar funciona', async () => {
  await seedStore({ dietPlan: plan, dietLog: { [TODAY]: toggleMeal(dayFromMenu({ ...menuB, id: 'old', name: 'Antigo' }), 'mb') } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  expect(await screen.findByText('Qua, 18 nov · Antigo')).toBeInTheDocument()
  await user.click(within(await more(user)).getByRole('button', { name: 'Cardápio de hoje' }))
  const menus = await screen.findByRole('list', { name: 'Cardápios' })
  const old = within(menus).getByRole('button', { name: 'Antigo' })
  expect(old).toBeDisabled()
  expect(old).toHaveAttribute('aria-current', 'true')
  await user.click(within(menus).getByRole('button', { name: 'Dia de treino' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Trocar' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY]).toBeUndefined())
  expect(await screen.findByText('Qua, 18 nov · Dia de treino')).toBeInTheDocument()
})

test('dia sem marca segue o plano trocado por fora, e o toque marca a refeição nova (B1)', async () => {
  await seedStore({ dietPlan: plan, dietLog: { [TODAY]: dayFromMenu(menuA) } }) // cópia sem marca de antes (backup, outra aba)
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  expect(await screen.findByText('Qua, 18 nov · Dia de treino')).toBeInTheDocument()
  await act(() => save('dietPlan', { ...plan, lastMenuId: 'B' }))
  expect(await screen.findByText('Qua, 18 nov · Descanso')).toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Único feita' }))
  await waitFor(async () => expect((await stored('dietLog'))?.[TODAY]).toMatchObject({ menuId: 'B', meals: [{ id: 'mb', done: true }] }))
})

test('trocar cardápio confirmado depois da meia-noite apaga o dia que foi confirmado (B2)', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 23, 59))
  await seedStore({ dietPlan: plan, dietLog: { [TODAY]: toggleMeal(dayFromMenu(menuA), 'm1') } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(within(await more(user)).getByRole('button', { name: 'Cardápio de hoje' }))
  await user.click(within(await screen.findByRole('list', { name: 'Cardápios' })).getByRole('button', { name: 'Descanso' }))
  const dialog = await screen.findByRole('alertdialog')
  vi.setSystemTime(new Date(2026, 10, 19, 0, 1))
  await user.click(within(dialog).getByRole('button', { name: 'Trocar' }))
  await waitFor(async () => expect((await stored('dietPlan'))?.lastMenuId).toBe('B'))
  expect((await stored('dietLog'))?.[TODAY]).toBeUndefined()
})

test('editar e salvar o cardápio não grava o dia (B7)', async () => {
  await seedStore({ dietPlan: plan })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(within(await more(user)).getByRole('button', { name: 'Editar cardápio' }))
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(await screen.findByRole('list', { name: 'Refeições' })).toBeInTheDocument()
  expect((await stored('dietPlan'))?.lastMenuId).toBe('A')
  expect(await stored('dietLog')).toBeUndefined()
})

test('água depois da meia-noite vai pro dia novo e a aba anda junto', async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 23, 59))
  await seedStore({ dietPlan: plan, settings: { ...DEFAULTS.settings, water: { enabled: true, goalMl: 2000 } } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('button', { name: /^Água/ }))
  const drawer = await screen.findByRole('dialog')
  vi.setSystemTime(new Date(2026, 10, 19, 0, 1))
  within(drawer).getByRole('slider', { name: 'Água de hoje' }).focus()
  await user.keyboard('{ArrowRight}')
  await waitFor(async () => expect((await stored('waterLog'))?.['2026-11-19']?.ml).toBe(100))
  expect((await stored('waterLog'))?.[TODAY]).toBeUndefined()
  expect(await screen.findByText('Qui, 19 nov', { exact: false })).toBeInTheDocument()
})

const SUPS = [{ id: 'a', name: 'Creatina', dose: '5 g', when: 'qualquer hora' }, { id: 'b', name: 'Vitamina D' }]
const supCard = () => screen.findByRole('region', { name: 'Suplementos' })

test('suplementos: card abaixo das refeições, marcar grava no dia', async () => {
  await seedStore({ dietPlan: plan, settings: { ...DEFAULTS.settings, supplements: SUPS } })
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  const card = await supCard()
  expect(within(card).getByText('0 de 2')).toBeInTheDocument()
  expect(within(card).getByText('Creatina')).toBeInTheDocument()
  expect(within(card).getByText('5 g · qualquer hora')).toBeInTheDocument()
  await user.click(within(card).getByRole('checkbox', { name: 'Creatina tomado' }))
  expect(await within(card).findByText('1 de 2')).toBeInTheDocument()
  await waitFor(async () => expect(await stored('supplementLog')).toEqual({ [TODAY]: { taken: ['a'], total: 2 } }))
})

test('suplementos: sem nenhum cadastrado, o card não aparece', async () => {
  await seedStore({ dietPlan: plan })
  await renderLoaded(<DietTab />)
  await screen.findByRole('list', { name: 'Refeições' })
  expect(screen.queryByRole('region', { name: 'Suplementos' })).not.toBeInTheDocument()
})

test('suplementos: sem cardápio, o card aparece abaixo do convite', async () => {
  await seedStore({ settings: { ...DEFAULTS.settings, supplements: [SUPS[1]] } })
  await renderLoaded(<DietTab />)
  expect(await screen.findByRole('heading', { name: 'Monte seu cardápio' })).toBeInTheDocument()
  expect(within(await supCard()).getByText('Vitamina D')).toBeInTheDocument()
})
