import { GROUPS, MUSCLE_GROUPS, OTHER_GROUP, muscleGroup } from '@/catalog/muscles'
import { daysBetween } from '@/lib/date'
import { isCardio } from '@/workout/reps'
import { hasMarkedSet, markedSets } from '@/workout/session'
import { completedSessions } from '@/workout/stats'
import { muscleLevels, type MuscleLevel } from '@/workout/summary'
import type { WorkoutSession } from '@/workout/types'
import { since30 } from './chart'

export type GroupStatus = 'trained' | 'auxiliary' | 'idle'
export interface GroupSets { token: string; label: string; perWeek: number; status: GroupStatus }

const ORDER: Record<GroupStatus, number> = { trained: 0, auxiliary: 1, idle: 2 }

// sem catálogo: plano antigo sem `primary` cai no 1º músculo
export function muscleSummary(sessions: WorkoutSession[], today: string): { levels: Map<string, MuscleLevel>; groups: GroupSets[] } | null {
  const from = since30(today)
  const done = completedSessions(sessions)
  const exercises = done.filter((s) => s.date >= from && s.date <= today).flatMap((s) => s.exercises).filter((e) => hasMarkedSet(e) && !isCardio(e))
  if (!exercises.length) return null
  const levels = muscleLevels(exercises)
  const firstDay = done[0].date
  // pelo menos uma semana: na 1ª, um treino só não vira "84 séries/sem"
  const weeks = Math.max(7, daysBetween(firstDay > from ? firstDay : from, today) + 1) / 7
  const sets = new Map<string, number>()
  for (const e of exercises) {
    const token = muscleGroup(e.muscles)
    sets.set(token, (sets.get(token) ?? 0) + markedSets(e).length)
  }
  const auxiliary = new Set([...levels.keys()].map((m) => MUSCLE_GROUPS.get(m)))
  const groups = GROUPS.filter((g) => g.token !== OTHER_GROUP).map(({ token, label }): GroupSets => {
    const n = sets.get(token) ?? 0
    return n > 0
      ? { token, label, perWeek: Math.max(1, Math.round(n / weeks)), status: 'trained' }
      : { token, label, perWeek: 0, status: auxiliary.has(token) ? 'auxiliary' : 'idle' }
  })
  return { levels, groups: groups.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.perWeek - a.perWeek) }
}
