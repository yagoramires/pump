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
