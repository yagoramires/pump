import { screen, waitFor, within } from '@testing-library/react'
import { renderLoaded } from '../test/render'
import { seedStore, stored } from '../test/store'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import { readCurrent } from './storage/db'
import App from './App'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { buildBackup } from './backup/backup'
import { CHANGELOG } from './shell/releases'
import { formatDayMonth } from './lib/date'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, get: vi.fn(m.get) }
})

afterEach(() => vi.unstubAllGlobals())

test('primeira vez abre a montagem; pular leva à aba Treino; depois abre na última aba', async () => {
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<App />)
  expect(await screen.findByRole('heading', { name: 'Sobre você' })).toBeInTheDocument()
  await user.type(screen.getByLabelText('Altura'), '178')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(screen.getByLabelText('Peso'), '82,4')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Pular por agora' }))
  await user.click(screen.getByRole('button', { name: 'Pular por agora' }))
  expect(await screen.findByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page')
  await waitFor(async () => expect((await stored('settings'))?.onboardingDone).toBe(true))
  unmount()
  await seedStore({ settings: { ...(await stored('settings'))!, lastTab: 'dieta' } })
  await renderLoaded(<App />)
  expect(await screen.findByRole('heading', { name: 'Monte seu cardápio' })).toBeInTheDocument()
})
test('abrir com perfil no formato antigo grava o peso como medição', async () => {
  await seedStore({
    settings: { lastTab: 'treino', onboardingDone: true, firstUseAt: '2026-11-01' },
    profile: { sex: 'M', heightCm: 180, weightKg: 82.4 } as never,
  })
  await renderLoaded(<App />)
  await waitFor(async () => expect(await readCurrent('measurements')).toMatchObject([{ date: '2026-11-01', weightKg: 82.4 }]))
  expect(await readCurrent('profile')).not.toHaveProperty('weightKg')
})
test('Configurações: grupo DIETA abre cardápio, IA e a tela da água, e cada uma volta pro menu', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await seedStore({ settings: { lastTab: 'dieta', onboardingDone: true, seenChangelog: CHANGELOG[0].date }, profile: { sex: 'M', heightCm: 180 } })
  const user = userEvent.setup()
  await renderLoaded(<App />)
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  expect(screen.getByText('DIETA')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Cardápio/ }))
  expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  const treino = within(screen.getByRole('group', { name: 'TREINO' }))
  const dieta = within(screen.getByRole('group', { name: 'DIETA' }))
  expect(treino.getByRole('button', { name: /Gerar com IA/ })).toBeInTheDocument()
  expect(treino.getByRole('button', { name: /Converter/ })).toBeInTheDocument()
  expect(dieta.getByRole('button', { name: /Converter/ })).toBeInTheDocument()
  await user.click(dieta.getByRole('button', { name: /Gerar com IA/ }))
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: /Água/ }))
  expect(await screen.findByRole('switch', { name: 'Contador de água' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
})
test('dados ilegíveis: tela de erro em vez da montagem, sem gravar nada', async () => {
  const settings = { lastTab: 'treino' as const, onboardingDone: true }
  await seedStore({ settings })
  vi.mocked(idb.get).mockRejectedValueOnce(new Error('boom'))
  await renderLoaded(<ErrorBoundary><App /></ErrorBoundary>)
  expect(await screen.findByRole('heading', { name: 'Não consegui ler seus dados' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Sobre você' })).not.toBeInTheDocument()
  expect(await stored('settings')).toEqual(settings)
})

const backupFile = (data: Record<string, unknown>) => new File([JSON.stringify(buildBackup(data, new Date()))], 'pump-backup.json', { type: 'application/json' })

test('Configurações: restaurar backup confirma, troca os dados e recarrega; arquivo ruim mostra o erro', async () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...location, reload })
  await seedStore({ settings: { lastTab: 'treino', onboardingDone: true, seenChangelog: CHANGELOG[0].date } })
  const user = userEvent.setup()
  await renderLoaded(<App />)
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  await user.upload(screen.getByLabelText('Arquivo de backup'), new File(['{}'], 'x.json', { type: 'application/json' }))
  await user.click(await screen.findByRole('button', { name: 'Restaurar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/backup/i)
  expect(reload).not.toHaveBeenCalled()
  const settings = { lastTab: 'dieta' as const, onboardingDone: true, seenChangelog: CHANGELOG[0].date }
  await user.upload(screen.getByLabelText('Arquivo de backup'), backupFile({ settings }))
  expect(await screen.findByText('Isso substitui todos os seus dados. Continuar?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Restaurar' }))
  await waitFor(() => expect(reload).toHaveBeenCalled())
  expect(await stored('settings')).toMatchObject(settings)
})
test('versão nova abre as Novidades uma vez; Configurações lista o histórico', async () => {
  await seedStore({ settings: { lastTab: 'treino', onboardingDone: true } })
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<App />)
  const sheet = await screen.findByRole('dialog', { name: 'Novidades' })
  expect(within(sheet).getByText('Correções')).toBeInTheDocument()
  await user.click(within(sheet).getByRole('button', { name: 'Entendi' }))
  await waitFor(async () => expect((await stored('settings'))?.seenChangelog).toBe(CHANGELOG[0].date))
  unmount()
  await renderLoaded(<App />)
  await user.click(await screen.findByRole('button', { name: /configurações/i }))
  expect(screen.queryByRole('dialog', { name: 'Novidades' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^Novidades/ }))
  expect(await screen.findByRole('heading', { name: formatDayMonth(CHANGELOG[0].date) })).toBeInTheDocument()
})
