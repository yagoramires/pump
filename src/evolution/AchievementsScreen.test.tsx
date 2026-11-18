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
  expect(await screen.findByText('1 de 12')).toBeInTheDocument()
  expect(screen.getByText('falta 9')).toBeInTheDocument()
  expect(screen.getByText('16 nov')).toBeInTheDocument()
})
test('sem dieta a estante mostra "de 12"; com cardápio "de 15"', async () => {
  const { unmount } = await renderLoaded(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText('0 de 12')).toBeInTheDocument()
  unmount()
  await save('dietPlan', { menus: [{ id: 'm', name: 'Padrão', meals: [] }] })
  await renderLoaded(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText('0 de 15')).toBeInTheDocument()
  expect(screen.getByText('Dia no plano')).toBeInTheDocument()
  expect(screen.getByText('Água 7 dias')).toBeInTheDocument()
})
