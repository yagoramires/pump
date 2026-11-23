import { carryRest, dropSession, restRecord } from './rest'
import type { WorkoutSession } from './types'

const s = (date: string, extra?: Partial<WorkoutSession>): WorkoutSession => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [], ...extra })

test('sessão começada no descanso devolve o descanso ao ser descartada, mesmo de outro dia', () => {
  const started = carryRest(restRecord('2026-11-15'), s('2026-11-15'))
  expect(dropSession({ '2026-11-15': started, '2026-11-14': s('2026-11-14') }, started)).toEqual({ '2026-11-15': restRecord('2026-11-15'), '2026-11-14': s('2026-11-14') })
})
test('sem descanso antes, descartar deixa o dia vazio', () => {
  const started = carryRest(undefined, s('2026-11-15'))
  expect(dropSession({ '2026-11-15': started }, started)).toEqual({})
})
test('trocar de treino mantém a marca do descanso', () => {
  expect(carryRest(carryRest(restRecord('2026-11-15'), s('2026-11-15')), s('2026-11-15', { workoutId: 'b' })).replacesRest).toBe(true)
})
