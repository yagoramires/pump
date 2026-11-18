import { screen } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '../storage/db'
import { AchievementsScreen } from './AchievementsScreen'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('estante mostra ganhas e bloqueadas com progresso', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: '2026-11-16T19:00:00.000Z', exercises: [] } })
  await renderLoaded(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText(/^1 de \d+$/)).toBeInTheDocument()
  expect(screen.getByText('falta 9')).toBeInTheDocument()
  expect(screen.getByText('16 nov')).toBeInTheDocument()
})
test('sem dieta a estante não tem as de dieta; com cardápio tem', async () => {
  const { unmount } = await renderLoaded(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText('Primeiro treino')).toBeInTheDocument()
  expect(screen.queryByText('Dia no plano')).not.toBeInTheDocument()
  unmount()
  await save('dietPlan', { menus: [{ id: 'm', name: 'Padrão', meals: [] }] })
  await renderLoaded(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText('Dia no plano')).toBeInTheDocument()
  expect(screen.getByText('7 dias na dieta')).toBeInTheDocument()
  expect(screen.getByText('Água 7 dias')).toBeInTheDocument()
})
