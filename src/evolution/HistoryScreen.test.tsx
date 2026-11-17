import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import { loadPhoto, savePhoto } from '../storage/photos'
import { HistoryScreen } from './HistoryScreen'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
afterEach(() => vi.useRealTimers())

test('apagar fotos do dia remove o registro e as fotos', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12))
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: id }])
  const user = userEvent.setup()
  render(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '17' }))
  await user.click(screen.getByRole('button', { name: 'Apagar fotos' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await load('photoSets')).toEqual([]))
  expect(await loadPhoto(id)).toBeUndefined()
  vi.useRealTimers()
})
test('detalhe do dia mostra o treino concluído', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12))
  await save('workoutLog', {
    '2026-11-16': {
      date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps',
      startedAt: '2026-11-16T18:00:00.000Z', completedAt: '2026-11-16T18:52:00.000Z',
      exercises: [{ exerciseId: 'supino', name: 'Supino', muscle: 'peito', images: [], instructions: [], reps: '10', weightKg: 40, restSec: 60, sets: [{ reps: '10', weightKg: 40 }, { reps: '10', weightKg: 40 }, null] }],
    },
  } as never)
  const user = userEvent.setup()
  render(<HistoryScreen onClose={vi.fn()} />)
  const day = await screen.findByRole('button', { name: '16' })
  expect(day).toHaveClass('bg-accent-bg')
  await user.click(day)
  expect(screen.getByText('Peito e tríceps')).toBeInTheDocument()
  expect(screen.getByText('2 séries · 800 kg · 52 min')).toBeInTheDocument()
})
test('apagar medidas do dia remove o registro', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12))
  await save('measurements', [{ id: 'm', date: '2026-11-17', weightKg: 78.4, waistCm: 81 }, { id: 'n', date: '2026-11-10', weightKg: 79 }])
  const user = userEvent.setup()
  render(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '17' }))
  expect(screen.getByText('Peso 78,4 kg · Cintura 81 cm')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Apagar medidas' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await load('measurements')).toEqual([{ id: 'n', date: '2026-11-10', weightKg: 79 }]))
})
test('abre com hoje selecionado e o dia descreve o que tem registrado', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12))
  await save('measurements', [{ id: 'm', date: '2026-11-17', weightKg: 78.4 }])
  render(<HistoryScreen onClose={vi.fn()} />)
  const today = await screen.findByRole('button', { name: '17' })
  expect(today).toHaveAttribute('aria-pressed', 'true')
  expect(today).toHaveAttribute('aria-current', 'date')
  expect(today).toHaveAccessibleDescription('com registro')
  expect(screen.getByText('Peso 78,4 kg')).toBeInTheDocument()
})
