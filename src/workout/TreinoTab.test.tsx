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
  expect(await screen.findByText('Remada X')).toBeInTheDocument()
  expect(screen.getByText('3 × 10 · 0 kg')).toBeInTheDocument()
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
test('editar carga inline e marcar; editar série feita grava a partir da guardada', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  const kg = await screen.findByRole('textbox', { name: 'Carga da série 1 de Supino reto' })
  await user.clear(kg); await user.type(kg, '45')
  await user.click(screen.getByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 45 }))
  const reps = screen.getByRole('textbox', { name: 'Reps da série 1 de Supino reto' })
  await user.clear(reps); await user.type(reps, '8{Enter}')
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '8', weightKg: 45 }))
  await user.clear(kg); await user.type(kg, 'abc'); await user.tab()
  expect(kg).toHaveValue('45')
  expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '8', weightKg: 45 })
})
test('voltar do segundo plano num novo dia mostra o treino do novo dia', async () => {
  render(<TreinoTab />)
  expect(await screen.findByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
  vi.setSystemTime(new Date(2026, 10, 17, 7, 0)) // terça, sem treino
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText('Dia de descanso')).toBeInTheDocument()
})
test('treino em andamento passa da meia-noite e segue no mesmo dia ao voltar', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16']).toBeDefined())
  vi.setSystemTime(new Date(2026, 10, 17, 0, 30))
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.getByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
  expect(screen.queryByText('Dia de descanso')).not.toBeInTheDocument()
})
test('carga com vírgula na tabela grava decimal', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  const kg = await screen.findByRole('textbox', { name: 'Carga da série 1 de Supino reto' })
  await user.clear(kg); await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 22.5 }))
})
test('dois checks rápidos em séries diferentes persistem os dois', async () => {
  render(<TreinoTab />)
  const s1 = await screen.findByRole('button', { name: 'Série 1 de Supino reto' })
  const s2 = screen.getByRole('button', { name: 'Série 2 de Supino reto' })
  await act(async () => { s1.click(); s2.click() })
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets.filter(Boolean)).toHaveLength(2))
})
test('exercício com 6 séries e nome longo mostra 6 linhas', async () => {
  await save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Supino inclinado com halteres e pegada neutra no banco a 45 graus', sets: 6 })] }] })
  render(<TreinoTab />)
  for (let n = 1; n <= 6; n++) expect(await screen.findByRole('button', { name: `Série ${n} de Supino inclinado com halteres e pegada neutra no banco a 45 graus` })).toBeInTheDocument()
})
test('resumo: 1/2 séries e volume; sessão antiga sem startedAt não mostra minutos', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps', exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 40 }, null] }] } })
  render(<TreinoTab />)
  expect(await screen.findByText('400 kg')).toBeInTheDocument()
  expect(screen.getAllByText('1/2')).toHaveLength(2) // anel do resumo + card do exercício
  expect(screen.queryByText(/min/)).not.toBeInTheDocument()
})
test('completar o último set do aberto abre o próximo incompleto', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await user.click(screen.getByRole('button', { name: 'Série 2 de Supino reto' }))
  expect(await screen.findByRole('button', { name: 'Série 1 de Remada X' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Série 1 de Supino reto' })).not.toBeInTheDocument()
})
