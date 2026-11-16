import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import type { WorkoutPlan } from '../types'
import { pe } from '../../test/helpers'
import { TreinoTab } from './TreinoTab'

const plano: WorkoutPlan = { workouts: [
  { id: 'a', label: 'A', name: 'Peito e tríceps', weekdays: [1], exercises: [
    pe({ exerciseId: 'Supino', name: 'Supino reto', sets: 2, reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg', 'S/1.jpg'] }),
    pe({ exerciseId: 'custom-1', name: 'Remada X', custom: true, note: 'banco 3' }),
  ] },
] }
beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] }) // só o relógio; IndexedDB/findBy/user-event seguem com timers reais
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0)) // segunda
  await save('workoutPlan', plano)
})
afterEach(() => vi.useRealTimers())

test('marcar série inicia descanso e persiste; concluir grava check-in', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  expect(await screen.findByText('01:00')).toBeInTheDocument()
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 40 }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].completedAt).toBeDefined())
})
test('descanso sobrevive a recarregar: restante calculado do relógio', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].restEndsAt).toBeDefined())
  unmount()
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
  render(<TreinoTab />)
  expect(await screen.findByText('00:30')).toBeInTheDocument()
})
test('editar o plano no meio do treino não muda o que está na tela', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await act(() => save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Outro', reps: '5' })] }] }))
  expect(await screen.findByText('2 × 10 · 40 kg')).toBeInTheDocument()
  expect(screen.queryByText('Outro')).not.toBeInTheDocument()
})
test('domingo sem treino mostra Dia de descanso', async () => {
  vi.setSystemTime(new Date(2026, 10, 22, 10, 0))
  render(<TreinoTab />)
  expect(await screen.findByText('Dia de descanso')).toBeInTheDocument()
})
test('exercício sem foto: ícone na miniatura e preview só com texto', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  const thumb = await screen.findByRole('button', { name: 'Ver Remada X' })
  expect(within(thumb).queryByRole('img')).not.toBeInTheDocument()
  await user.click(thumb)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('banco 3')).toBeInTheDocument()
  expect(within(dialog).queryByRole('img')).not.toBeInTheDocument()
})
