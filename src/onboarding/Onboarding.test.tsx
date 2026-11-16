import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import { buildBackup } from '../storage/backup'
import { Onboarding } from './Onboarding'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
afterEach(() => vi.unstubAllGlobals())

test('primeiro passo restaura um backup e recarrega o app', async () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...location, reload })
  vi.stubGlobal('confirm', vi.fn(() => true))
  await save('profile', { sex: 'F', heightCm: 1, weightKg: 1 })
  const settings = { lastTab: 'treino' as const, onboardingDone: true }
  const file = new File([JSON.stringify(buildBackup({ settings }, new Date()))], 'pump-backup.json', { type: 'application/json' })
  render(<Onboarding setSettings={vi.fn()} />)
  await userEvent.setup().upload(screen.getByLabelText('Arquivo de backup'), file)
  await waitFor(() => expect(reload).toHaveBeenCalled())
  expect(confirm).toHaveBeenCalledWith('Isso substitui todos os seus dados. Continuar?')
  expect(await load('settings')).toEqual(settings)
  expect(await load('profile')).toBeUndefined()
})
