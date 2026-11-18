import { screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '@/storage/db'
import { buildBackup } from '@/storage/backup'
import { Onboarding } from './Onboarding'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
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

test('sem internet ao usar um plano pronto mostra o aviso', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  const user = userEvent.setup()
  await renderLoaded(<Onboarding />)
  await user.click(screen.getByRole('button', { name: 'Pular' }))
  await user.click(screen.getByRole('radio', { name: 'ABC' }))
  await user.click(screen.getByRole('button', { name: 'Usar ABC' }))
  expect(await screen.findByText(/Sem internet pra carregar o modelo/)).toBeInTheDocument()
})
