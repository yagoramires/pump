import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '@/storage/db'
import type { WorkoutSession } from './types'
import { pe } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { PastWorkouts } from './PastWorkouts'
const sess = (date: string, name: string, over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: name, completedAt: `${date}T19:00:00`,
  exercises: [
    { ...pe({ exerciseId: 'Supino', name: 'Supino reto' }), sets: [{ reps: '10', weightKg: 40 }, null] },
    { ...pe({ exerciseId: 'Rosca', name: 'Rosca direta' }), sets: [null] },
  ],
  ...over,
})
beforeEach(async () => { await clear(); resetStoreForTests() })
test('lista em ordem decrescente e expande as séries feitas', async () => {
  await save('workoutLog', { '2026-11-10': sess('2026-11-10', 'Antigo'), '2026-11-14': sess('2026-11-14', 'Recente'), '2026-11-15': { ...sess('2026-11-15', 'Aberto'), completedAt: undefined } })
  const user = userEvent.setup()
  await renderLoaded(<PastWorkouts onClose={() => {}} />)
  const rows = screen.getAllByRole('button', { expanded: false })
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('Recente')
  expect(rows[1]).toHaveTextContent('Antigo')
  await user.click(rows[0])
  expect(rows[0]).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Supino reto')).toBeInTheDocument()
  expect(screen.getByText('40 kg × 10')).toBeInTheDocument()
  expect(screen.queryByText('Rosca direta')).not.toBeInTheDocument()
})
test('vazio', async () => {
  await renderLoaded(<PastWorkouts onClose={() => {}} />)
  expect(screen.getByText('Nenhum treino concluído ainda')).toBeInTheDocument()
})
