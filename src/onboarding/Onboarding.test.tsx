import { screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { load, readCurrent, save } from '@/storage/db'
import { buildBackup } from '@/storage/backup'
import { Onboarding } from './Onboarding'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const backupFile = () => {
  const settings = { lastTab: 'treino' as const, onboardingDone: true }
  return { settings, file: new File([JSON.stringify(buildBackup({ settings }, new Date()))], 'pump-backup.json', { type: 'application/json' }) }
}

test('primeiro passo restaura um backup depois de confirmar e recarrega o app', async () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...location, reload })
  await save('profile', { sex: 'F', heightCm: 1 })
  const { settings, file } = backupFile()
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await user.click(screen.getByRole('button', { name: 'Restaurar backup' }))
  await user.upload(screen.getByLabelText('Arquivo de backup'), file)
  expect(await screen.findByText('Isso substitui todos os seus dados. Continuar?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Restaurar' }))
  await waitFor(() => expect(reload).toHaveBeenCalled())
  expect(await load('settings')).toEqual(settings)
  expect(await load('profile')).toBeUndefined()
})

test('cancelar no diálogo não importa nada', async () => {
  const profile = { sex: 'F' as const, heightCm: 160 }
  await save('profile', profile)
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await user.upload(screen.getByLabelText('Arquivo de backup'), backupFile().file)
  await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
  await waitFor(() => expect(screen.queryByText('Restaurar backup?')).not.toBeInTheDocument())
  expect(await load('profile')).toEqual(profile)
  expect(await load('settings')).toBeUndefined()
})

const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Continuar' }))
const toTreino = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)
  await next(user)
  await user.type(screen.getByLabelText('Peso'), '82,4')
  await next(user)
}

test('pular o treino leva à dieta, não conclui', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await toTreino(user)
  expect(screen.getByText('PASSO 4 DE 5')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Seu treino' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pular por agora' }))
  expect(screen.getByRole('heading', { name: 'Sua dieta' })).toBeInTheDocument()
  expect((await readCurrent('settings')).onboardingDone).toBe(false)
})

test('voltar no passo 5 leva ao treino sem concluir', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await toTreino(user)
  await user.click(screen.getByRole('button', { name: 'Pular por agora' }))
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Seu treino' })).toBeInTheDocument()
  expect((await readCurrent('settings')).onboardingDone).toBe(false)
})

test('5 passos até concluir', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await toTreino(user)
  await user.click(screen.getByRole('button', { name: 'Pular por agora' }))
  await user.click(screen.getByRole('button', { name: 'Pular por agora' }))
  await waitFor(async () => expect((await readCurrent('settings')).onboardingDone).toBe(true))
})

test('restaurar backup no passo 1 conclui a montagem', async () => {
  vi.stubGlobal('location', { ...location, reload: vi.fn() })
  const old = { app: 'pump', version: 1, exportedAt: new Date().toISOString(), data: { settings: { lastTab: 'treino', onboardingDone: true }, profile: { sex: 'M', heightCm: 180 } } }
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await user.upload(screen.getByLabelText('Arquivo de backup'), new File([JSON.stringify(old)], 'b.json', { type: 'application/json' }))
  await user.click(await screen.findByRole('button', { name: 'Restaurar' }))
  await waitFor(async () => expect(await load('settings')).toMatchObject({ onboardingDone: true }))
})

test('sem internet ao usar um plano pronto mostra o aviso', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await toTreino(user)
  await user.click(screen.getByRole('radio', { name: 'ABC' }))
  await user.click(screen.getByRole('button', { name: 'Usar ABC' }))
  expect(await screen.findByText(/Sem internet pra carregar o modelo/)).toBeInTheDocument()
})

test('voltar no passo 4 leva ao Dia zero com o peso salvo', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await toTreino(user)
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Dia zero' })).toBeInTheDocument()
  expect(screen.getByLabelText('Peso')).toHaveValue('82,4')
})

test('passo 4 abre Gerar com IA e Converter e volta pro treino', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await toTreino(user)
  await user.click(screen.getByRole('button', { name: 'Gerar com IA' }))
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(screen.getByRole('button', { name: 'Converter' }))
  expect(await screen.findByRole('heading', { name: 'Converter ficha' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Seu treino' })).toBeInTheDocument()
})
