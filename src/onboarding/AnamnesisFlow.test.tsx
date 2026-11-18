import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { renderLoaded } from '../../test/render'
import { DEFAULTS } from '@/schema'
import { todayKey } from '@/lib/date'
import { readCurrent, resetStoreForTests, save } from '@/storage/db'
import { AnamnesisFlow } from './AnamnesisFlow'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
const today = todayKey()
const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Continuar' }))

test('passo 1 exige sexo e altura', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={5} onDone={vi.fn()} />)
  expect(screen.getByText('PASSO 1 DE 5')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  await user.type(screen.getByLabelText('Altura'), '178')
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
})

test('voltar do passo 3 ao 1 mantém o que foi digitado e não grava nada', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  await user.type(screen.getByLabelText('Idade'), '29')
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)
  await user.click(screen.getByRole('radio', { name: 'Perder peso' }))
  await next(user)
  expect(screen.getByRole('heading', { name: 'Dia zero' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByLabelText('Idade')).toHaveValue('29')
  expect(await readCurrent('profile')).toEqual(DEFAULTS.profile)
})

test('dia zero exige peso e grava perfil, medição e check-in juntos', async () => {
  const onDone = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={onDone} />)
  await user.type(screen.getByLabelText('Idade'), '29')
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)
  await user.click(screen.getByRole('radio', { name: 'Perder peso' }))
  await next(user)
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  await user.type(screen.getByLabelText('Peso'), '82,4')
  await user.type(screen.getByLabelText('Cintura'), '92')
  await user.click(screen.getByRole('radio', { name: 'Quarta' }))
  await next(user)
  expect(await readCurrent('measurements')).toMatchObject([{ date: today, weightKg: 82.4, waistCm: 92 }])
  expect(await readCurrent('settings')).toMatchObject({ checkInDay: 3, anamnesisAt: today })
  expect(await readCurrent('profile')).toMatchObject({ heightCm: 178, age: 29, dietGoal: 'perder', focus: 'hipertrofia' })
  expect(onDone).toHaveBeenCalled()
})

test('abre preenchido para quem já usa', async () => {
  await save('profile', { sex: 'M', heightCm: 180, age: 40, dietGoal: 'ganhar' })
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  expect(screen.getByLabelText('Idade')).toHaveValue('40')
  await next(user)
  expect(screen.getByRole('radio', { name: 'Ganhar peso' })).toBeChecked()
})
