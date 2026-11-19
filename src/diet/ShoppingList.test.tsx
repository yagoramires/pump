import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { load, save } from '@/storage/db'
import { DEFAULTS } from '@/schema'
import type { DietPlan } from './types'
import { ShoppingList } from './ShoppingList'
import { DietTab } from './DietTab'

const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
// depois do userEvent.setup(), que troca o clipboard pelo dele
const setupUser = () => {
  const user = userEvent.setup()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return user
}

const it_ = (name: string, grams: number, portion?: string) => ({ id: name, name, grams, portion, per100: { kcal: 1, p: 1, c: 1, f: 1 }, source: 'custom' as const })
const plan: DietPlan = { menus: [{ id: 'A', name: 'A', meals: [{ id: 'm', name: 'Café', time: '07:00', options: [{ id: 'o', items: [it_('Arroz', 100), it_('Ovo', 50, '1 ovo')] }] }] }], lastMenuId: 'A' }

beforeEach(async () => {
  writeText.mockClear()
  await save('settings', { ...DEFAULTS.settings, onboardingDone: true })
})

test('vazio sem dieta', async () => {
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  expect(await screen.findByText(/Sem dieta/)).toBeInTheDocument()
})

test('abre pelo menu da dieta', async () => {
  await save('dietPlan', plan)
  const user = userEvent.setup()
  await renderLoaded(<DietTab />)
  await user.click(await screen.findByRole('button', { name: 'Mais opções da dieta' }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Lista de compras' }))
  expect(await screen.findByRole('heading', { name: 'Lista de compras' })).toBeInTheDocument()
})

test('mês por padrão e semana troca as quantidades', async () => {
  await save('dietPlan', plan)
  const user = userEvent.setup()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  expect(await screen.findByText('3 kg')).toBeInTheDocument()
  expect(screen.getByText('≈ 30 ovos')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Semana' }))
  expect(screen.getByText('700 g')).toBeInTheDocument()
})

test('marcação persiste, remonta e limpa', async () => {
  await save('dietPlan', plan)
  const user = userEvent.setup()
  const first = await renderLoaded(<ShoppingList onClose={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Limpar marcações' })).not.toBeInTheDocument()
  await user.click(await screen.findByRole('checkbox', { name: 'Arroz' }))
  await waitFor(async () => expect((await load('settings'))?.shoppingChecked).toHaveLength(1))
  first.unmount()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  expect(await screen.findByRole('checkbox', { name: 'Arroz' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Limpar marcações' }))
  expect(screen.getByRole('checkbox', { name: 'Arroz' })).not.toBeChecked()
  await waitFor(async () => expect((await load('settings'))?.shoppingChecked).toEqual([]))
})

test('copia a lista de compras', async () => {
  await save('dietPlan', plan)
  const user = setupUser()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  await user.click(await screen.findByRole('button', { name: 'Copiar lista' }))
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('• Arroz — 3 kg'))
})

test('marcas de itens que não existem mais não aparecem nem contam', async () => {
  await save('dietPlan', plan)
  await save('settings', { ...DEFAULTS.settings, onboardingDone: true, shoppingChecked: ['n:fantasma'] })
  const user = userEvent.setup()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  await screen.findByRole('checkbox', { name: 'Arroz' })
  expect(screen.queryByRole('button', { name: 'Limpar marcações' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Arroz' }))
  expect(screen.getByRole('checkbox', { name: 'Arroz' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Ovo' })).not.toBeChecked()
})

test('com marcas copia só o que falta', async () => {
  await save('dietPlan', plan)
  const user = setupUser()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  await user.click(await screen.findByRole('checkbox', { name: 'Arroz' }))
  await user.click(screen.getByRole('button', { name: 'Copiar o que falta' }))
  const text = writeText.mock.calls[0][0]
  expect(text).toContain('Ovo')
  expect(text).not.toContain('Arroz')
})

test('tudo marcado desabilita a cópia', async () => {
  await save('dietPlan', plan)
  const user = setupUser()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  await user.click(await screen.findByRole('checkbox', { name: 'Arroz' }))
  await user.click(screen.getByRole('checkbox', { name: 'Ovo' }))
  const btn = screen.getByRole('button', { name: 'Tudo comprado' })
  expect(btn).toBeDisabled()
  await user.click(btn)
  expect(writeText).not.toHaveBeenCalled()
})

test('mantém compras distintas e a marcação salva de nomes não latinos', async () => {
  const withJapaneseNames = structuredClone(plan)
  const items = withJapaneseNames.menus[0].meals[0].options[0].items
  items[0].name = '豆腐'
  items[1].name = '味噌'
  await save('dietPlan', withJapaneseNames)
  await save('settings', { ...DEFAULTS.settings, shoppingChecked: ['n:豆腐'] })
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  expect(await screen.findByRole('checkbox', { name: '豆腐' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: '味噌' })).not.toBeChecked()
})
