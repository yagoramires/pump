import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { renderLoaded } from '../../test/render'
import { load, resetStoreForTests, save } from '@/storage/db'
import { DEFAULTS } from '@/schema'
import type { DietPlan } from './types'
import { ShoppingList } from './ShoppingList'
import { DietTab } from './DietTab'
import { copyText } from '@/lib/share'

vi.mock('@/lib/share', async (orig) => ({ ...(await orig<typeof import('@/lib/share')>()), copyText: vi.fn().mockResolvedValue(true) }))

const it_ = (name: string, grams: number, portion?: string) => ({ id: name, name, grams, portion, per100: { kcal: 1, p: 1, c: 1, f: 1 }, source: 'custom' as const })
const plan: DietPlan = { menus: [{ id: 'A', name: 'A', meals: [{ id: 'm', name: 'Café', time: '07:00', options: [{ id: 'o', items: [it_('Arroz', 100), it_('Ovo', 50, '1 ovo')] }] }] }], lastMenuId: 'A' }

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.mocked(copyText).mockClear()
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
  expect(screen.getByText('≈ 30 ovo')).toBeInTheDocument()
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

test('copiar lista usa o helper de cópia', async () => {
  await save('dietPlan', plan)
  const user = userEvent.setup()
  await renderLoaded(<ShoppingList onClose={() => {}} />)
  await user.click(await screen.findByRole('button', { name: 'Copiar lista' }))
  expect(copyText).toHaveBeenCalledWith(expect.stringContaining('• Arroz — 3 kg'))
})
