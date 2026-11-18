import type { PlanExercise, Workout } from './types'
import { screen } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests } from '@/storage/db'
import { PlanEditor } from './PlanEditor'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('Salvar entrega o plano editado pro onSave e não grava nada sozinho', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={{ workouts: [{ id: 'w1', label: 'A', name: 'Treino de pernas', weekdays: [1], exercises: [] }] }} onSave={onSave} onCancel={vi.fn()} />)
  const name = await screen.findByDisplayValue('Treino de pernas')
  await user.clear(name)
  await user.type(name, 'Pernas')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith({ workouts: [expect.objectContaining({ id: 'w1', name: 'Pernas' })] })
  expect(await load('workoutPlan')).toBeUndefined()
})

const workoutOf = (exercises: Partial<PlanExercise>[]): Workout => ({
  id: 'w1', label: 'A', name: 'Peito', weekdays: [1],
  exercises: exercises.map((e) => ({ exerciseId: 'x', muscles: ['peito'], images: [], instructions: [], ...e }) as PlanExercise),
})
const supino = { name: 'Supino reto', sets: 3, reps: '10-12', weightKg: 40, restSec: 90 }

test('tocar no exercício abre a gaveta; +2,5 kg e Pronto atualiza o resumo', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino])] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  await user.click(screen.getByRole('button', { name: 'Aumentar carga' }))
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 42,5 kg · 90 s')).toBeInTheDocument()
})

test('carga digitada com vírgula na gaveta', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino])] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  const kg = screen.getByRole('textbox', { name: 'Carga em kg' })
  await user.clear(kg)
  await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 22,5 kg · 90 s')).toBeInTheDocument()
})
