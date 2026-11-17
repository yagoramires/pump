import { render, screen } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '../storage/db'
import { AchievementsScreen } from './AchievementsScreen'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('estante mostra ganhas e bloqueadas com progresso', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: '2026-11-16T19:00:00.000Z', exercises: [] } })
  render(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText('1 de 12')).toBeInTheDocument()
  expect(screen.getByText('falta 9')).toBeInTheDocument()
  expect(screen.getByText('16 nov')).toBeInTheDocument()
})
