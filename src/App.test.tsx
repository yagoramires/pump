import { screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../test/render'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from './storage/db'
import App from './App'
import { ErrorBoundary } from './shell/ErrorBoundary'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, get: vi.fn(m.get) }
})

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('primeira vez abre a montagem; pular leva à aba Treino; depois abre na última aba', async () => {
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<App />)
  expect(await screen.findByRole('heading', { name: 'Sobre você' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pular' })) // perfil
  await user.click(screen.getByRole('button', { name: 'Pular' })) // treino
  expect(await screen.findByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page')
  await waitFor(async () => expect((await load('settings'))?.onboardingDone).toBe(true))
  unmount()
  resetStoreForTests()
  await save('settings', { ...(await load('settings'))!, lastTab: 'dieta' })
  await renderLoaded(<App />)
  expect(await screen.findByRole('heading', { name: 'Monte seu cardápio' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Evolução' }))
  expect(await screen.findByRole('heading', { name: 'Sua evolução começa aqui' })).toBeInTheDocument()
})
test('Configurações: grupo DIETA abre cardápio, IA e a tela da água', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await save('settings', { lastTab: 'dieta', onboardingDone: true })
  await save('profile', { sex: 'M', heightCm: 180, weightKg: 80 })
  resetStoreForTests()
  const user = userEvent.setup()
  await renderLoaded(<App />)
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  expect(screen.getByText('DIETA')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Cardápio/ }))
  expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await user.click(await screen.findByRole('button', { name: /Gerar com IA/ }))
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: /Água/ }))
  const sw = await screen.findByRole('switch', { name: 'Contador de água' })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  await user.click(sw)
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: true, goalMl: 2750, cupMl: 250 }))
  const meta = screen.getByRole('textbox', { name: 'Meta (ml)' })
  await user.clear(meta)
  await user.type(meta, '3000')
  await waitFor(async () => expect((await load('settings'))?.water?.goalMl).toBe(3000))
  await user.clear(screen.getByRole('textbox', { name: 'Copo (ml)' }))
  await user.type(screen.getByRole('textbox', { name: 'Copo (ml)' }), '300')
  await waitFor(async () => expect((await load('settings'))?.water?.cupMl).toBe(300))
  await user.click(screen.getByRole('switch', { name: 'Contador de água' }))
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: false, goalMl: 3000, cupMl: 300 }))
  await user.click(screen.getByRole('switch', { name: 'Contador de água' })) // religar mantém o que a pessoa ajustou
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: true, goalMl: 3000, cupMl: 300 }))
  vi.unstubAllGlobals()
})
test('dados ilegíveis: tela de erro em vez da montagem, sem gravar nada', async () => {
  const settings = { lastTab: 'treino' as const, onboardingDone: true }
  await save('settings', settings)
  resetStoreForTests()
  vi.mocked(idb.get).mockRejectedValueOnce(new Error('boom'))
  await renderLoaded(<ErrorBoundary><App /></ErrorBoundary>)
  expect(await screen.findByRole('heading', { name: 'Não consegui ler seus dados' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Sobre você' })).not.toBeInTheDocument()
  resetStoreForTests()
  expect(await load('settings')).toEqual(settings)
})
