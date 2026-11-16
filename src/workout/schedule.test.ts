import { workoutForDate } from './schedule'
import { planOf } from '../../test/helpers'

test('treino do dia pelo dia da semana; descanso → undefined', () => {
  const plan = planOf([{ id: 'a', weekdays: [1, 3, 5] }, { id: 'b', weekdays: [2, 4] }])
  expect(workoutForDate(plan, '2026-11-16')?.id).toBe('a')
  expect(workoutForDate(plan, '2026-11-17')?.id).toBe('b')
  expect(workoutForDate(plan, '2026-11-22')).toBeUndefined()
})
