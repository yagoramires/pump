import { waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { pe } from '../../test/helpers'
import { renderHookLoaded } from '../../test/render'
import { load, resetStoreForTests, save } from '../storage/db'
import { useAchievementToasts } from './useAchievementToasts'

vi.mock('sonner', () => ({ toast: vi.fn() }))

const session = { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: '2026-11-16T19:00:00.000Z', exercises: [{ ...pe(), sets: [{ reps: '10', weightKg: 10 }] }] }

beforeEach(async () => {
  const { clear } = await import('idb-keyval')
  await clear()
  resetStoreForTests()
  vi.mocked(toast).mockClear()
})

test('primeira vez: grava como vistas, sem toast', async () => {
  await save('workoutLog', { '2026-11-16': session })
  await save('settings', { lastTab: 'treino', onboardingDone: true })
  await renderHookLoaded(() => useAchievementToasts())
  await waitFor(async () => expect((await load('settings'))?.seenAchievements).toContain('first-workout'))
  expect(toast).not.toHaveBeenCalled()
})
test('conquista nova: um toast só', async () => {
  await save('workoutLog', { '2026-11-16': session })
  await save('settings', { lastTab: 'treino', onboardingDone: true, seenAchievements: [] })
  const h = await renderHookLoaded(() => useAchievementToasts())
  await waitFor(() => expect(toast).toHaveBeenCalledWith('Conquista: Primeiro treino'))
  h.rerender()
  await waitFor(async () => expect((await load('settings'))?.seenAchievements).toContain('first-workout'))
  expect(toast).toHaveBeenCalledTimes(1)
})
