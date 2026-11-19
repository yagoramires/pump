import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { DEFAULTS } from '@/schema'
import { readCurrent, save } from '@/storage/db'
import { AnamnesisFlow } from './AnamnesisFlow'

const today = '2026-11-18'
const mediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0))
})
afterEach(() => {
  vi.useRealTimers()
  if (mediaDevices) Object.defineProperty(navigator, 'mediaDevices', mediaDevices)
  else Reflect.deleteProperty(navigator, 'mediaDevices')
})
const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Continuar' }))

test('passo 1 exige sexo e altura', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={5} onDone={vi.fn()} />)
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

test('dia zero mantém o peso digitado depois de abrir e fechar as fotos', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)
  await next(user)
  await user.type(screen.getByLabelText('Peso'), '82,4')
  await user.click(screen.getByRole('button', { name: 'Frente' }))
  expect(screen.getByLabelText('Escolher da galeria')).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: 'Voltar' }).at(-1)!)
  expect(screen.queryByLabelText('Escolher da galeria')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Peso')).toHaveValue('82,4')
})

test('sexo F mostra Quadril no dia zero', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  await user.click(screen.getByRole('radio', { name: 'Feminino' }))
  await user.type(screen.getByLabelText('Altura'), '165')
  await next(user)
  await user.click(screen.getByRole('radio', { name: 'Perder peso' }))
  await next(user)
  expect(screen.getByLabelText('Quadril')).toBeInTheDocument()
})

test('dia zero conserva a data de início ao passar da meia-noite', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)
  await next(user)

  vi.setSystemTime(new Date(2026, 10, 19, 0, 5))
  await user.click(screen.getByRole('radio', { name: 'Quinta' }))
  await user.type(screen.getByLabelText('Peso'), '82,4')
  await next(user)

  expect(await readCurrent('measurements')).toMatchObject([{ date: today, weightKg: 82.4 }])
  expect(await readCurrent('settings')).toMatchObject({ checkInDay: 4, anamnesisAt: today })
})

test('dia zero usa o novo dia quando a etapa anterior passou da meia-noite', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)

  vi.setSystemTime(new Date(2026, 10, 19, 0, 5))
  await next(user)
  await user.type(screen.getByLabelText('Peso'), '82,4')
  await next(user)

  expect(await readCurrent('measurements')).toMatchObject([{ date: '2026-11-19', weightKg: 82.4 }])
  expect(await readCurrent('settings')).toMatchObject({ checkInDay: 4, anamnesisAt: '2026-11-19' })
})

test('avisos e opcionais em cada passo', async () => {
  const user = userEvent.setup()
  await renderLoaded(<AnamnesisFlow total={3} onDone={vi.fn()} />)
  expect(screen.getByText('Só a altura é obrigatória. O resto deixa os prompts de IA mais precisos e dá pra completar depois em Configurações › Perfil.')).toBeInTheDocument()
  expect(screen.getAllByText('opcional')).toHaveLength(6) // idade, 3 horários, dias, lesões
  await user.type(screen.getByLabelText('Altura'), '178')
  await next(user)
  expect(screen.getByText('Tudo opcional, dá pra pular.')).toBeInTheDocument()
  await next(user)
  expect(screen.getByText('Só o peso é obrigatório. Medidas melhoram a estimativa de % de gordura; fotos ajudam a comparar depois.')).toBeInTheDocument()
  expect(screen.getAllByText('opcional')).toHaveLength(6) // sexo M: pescoço, cintura, braço, peito, coxa + fotos
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled() // peso segue obrigatório
})
