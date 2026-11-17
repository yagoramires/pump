import type { PlanExercise, Workout } from '../types'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import { PlanEditor } from './PlanEditor'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('sem initial, abre o plano salvo e o Salvar não o apaga', async () => {
  await save('workoutPlan', { workouts: [{ id: 'w1', label: 'A', name: 'Treino de pernas', weekdays: [1], exercises: [] }] })
  resetStoreForTests() // força o carregamento assíncrono a partir do banco
  const onDone = vi.fn()
  render(<PlanEditor onDone={onDone} />)
  expect(await screen.findByDisplayValue('Treino de pernas')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  expect((await load('workoutPlan'))?.workouts.map((w) => w.name)).toEqual(['Treino de pernas'])
})

const workoutOf = (exercises: Partial<PlanExercise>[]): Workout => ({
  id: 'w1', label: 'A', name: 'Peito', weekdays: [1],
  exercises: exercises.map((e) => ({ exerciseId: 'x', muscles: ['peito'], images: [], instructions: [], ...e }) as PlanExercise),
})
const supino = { name: 'Supino reto', sets: 3, reps: '10-12', weightKg: 40, restSec: 90 }

test('tocar no exercício abre a gaveta; +2,5 kg e Pronto atualiza o resumo', async () => {
  const user = userEvent.setup()
  render(<PlanEditor initial={{ workouts: [workoutOf([supino])] }} onDone={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  await user.click(screen.getByRole('button', { name: 'Aumentar carga' }))
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 42,5 kg · 90 s')).toBeInTheDocument()
})

test('carga digitada com vírgula na gaveta', async () => {
  const user = userEvent.setup()
  render(<PlanEditor initial={{ workouts: [workoutOf([supino])] }} onDone={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  const kg = screen.getByRole('textbox', { name: 'Carga em kg' })
  await user.clear(kg)
  await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 22,5 kg · 90 s')).toBeInTheDocument()
})
