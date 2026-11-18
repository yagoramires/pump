import { screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../test/render'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from './storage/db'
import App from './App'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { buildBackup } from './storage/backup'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, get: vi.fn(m.get) }
})

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
afterEach(() => vi.unstubAllGlobals())

test('primeira vez abre a montagem; pular leva à aba Treino; depois abre na última aba', async () => {
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<App />)
  expect(await screen.findByRole('heading', { name: 'Sobre você' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pular' }))
  await user.click(screen.getByRole('button', { name: 'Pular' }))
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
test('Configurações: grupo DIETA abre cardápio, IA e a tela da água, e cada uma volta pro menu', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await save('settings', { lastTab: 'dieta', onboardingDone: true })
  await save('profile', { sex: 'M', heightCm: 180 })
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
  expect(await screen.findByRole('switch', { name: 'Contador de água' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
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

const backupFile = (data: Record<string, unknown>) => new File([JSON.stringify(buildBackup(data, new Date()))], 'pump-backup.json', { type: 'application/json' })

test('Configurações: restaurar backup confirma, troca os dados e recarrega; arquivo ruim mostra o erro', async () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...location, reload })
  await save('settings', { lastTab: 'treino', onboardingDone: true })
  resetStoreForTests()
  const user = userEvent.setup()
  await renderLoaded(<App />)
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  await user.upload(screen.getByLabelText('Arquivo de backup'), new File(['{}'], 'x.json', { type: 'application/json' }))
  await user.click(await screen.findByRole('button', { name: 'Restaurar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/backup/i)
  expect(reload).not.toHaveBeenCalled()
  const settings = { lastTab: 'dieta' as const, onboardingDone: true }
  await user.upload(screen.getByLabelText('Arquivo de backup'), backupFile({ settings }))
  expect(await screen.findByText('Isso substitui todos os seus dados. Continuar?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Restaurar' }))
  await waitFor(() => expect(reload).toHaveBeenCalled())
  expect(await load('settings')).toMatchObject(settings)
})
