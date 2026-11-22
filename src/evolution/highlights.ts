import { addDays, daysBetween, formatDayMonth } from '@/lib/date'
import { formatDec, formatKg } from '@/lib/number'
import { completedSessions, exerciseHistory, loadPoints } from '@/workout/stats'
import { exerciseMarks, type Mark } from '@/workout/summary'
import { weeklyGoal } from '@/workout/week'
import { goalStreak } from './consistency'
import { goalDirection, isGood } from './goal'
import { fatSeries, series, type Point } from './measurements'
import type { EvolutionInput } from './types'

export type EvoHighlight = { kind: 'record' | 'weight' | 'streak'; title: string; detail: string; trend?: 'down' | 'up' | 'flat' }

const when = (date: string, today: string) => (date === today ? 'hoje' : date === addDays(today, -1) ? 'ontem' : formatDayMonth(date))
/** último ponto até `date`, com a data real dele */
const lastUpTo = (points: Point[], date: string) => points.filter((p) => p.date <= date).at(-1)

function record(d: EvolutionInput, today: string): EvoHighlight | undefined {
  const sessions = completedSessions(d.sessions)
  const from = addDays(today, -29)
  let best: { date: string; exerciseId: string; name: string; mark: Mark } | undefined
  for (const s of sessions.filter((x) => x.date >= from && x.date <= today)) {
    for (const [exerciseId, { name, record: mark }] of exerciseMarks(d.sessions, s)) {
      if (mark && (!best || s.date > best.date || (s.date === best.date && mark.kg > best.mark.kg))) best = { date: s.date, exerciseId, name, mark }
    }
  }
  if (!best) return undefined
  const { name, mark, date } = best
  if (mark.kind === 'reps') {
    return { kind: 'record', title: `Recorde no ${name}: ${mark.reps} reps com ${formatKg(mark.kg)} kg`, detail: `+${mark.reps - mark.prevReps} reps · antes ${mark.prevReps} · ${when(date, today)}` }
  }
  const first = loadPoints(exerciseHistory(sessions).get(best.exerciseId) ?? [])[0]
  // exercício que depois virou por tempo some do histórico: compara com o recorde anterior
  if (!first) return { kind: 'record', title: `Recorde no ${name}: ${formatKg(mark.kg)} kg`, detail: `+${formatKg(mark.kg - mark.prevKg)} kg · antes ${formatKg(mark.prevKg)} kg · ${when(date, today)}` }
  return {
    kind: 'record',
    title: `Recorde no ${name}: ${formatKg(mark.kg)} kg`,
    detail: `+${formatKg(mark.kg - first.value)} kg desde ${formatDayMonth(first.date)} · ${when(date, today)}`,
  }
}

function weight(d: EvolutionInput, today: string): EvoHighlight | undefined {
  const points = series(d.measurements, 'weightKg')
  const last = points.at(-1)
  if (!last || points.length < 2 || last.date < addDays(today, -29)) return undefined
  const base = lastUpTo(points, addDays(today, -30)) ?? points[0]
  if (base === last) return undefined
  const n = daysBetween(base.date, last.date)
  const delta = last.value - base.value
  const abs = Math.abs(delta)
  if (d.profile.dietGoal === 'manter') {
    return abs < 1 && n >= 21 ? { kind: 'weight', title: 'Peso estável', detail: `±${formatDec(abs)} kg em ${n} dias`, trend: 'flat' } : undefined
  }
  const dir = goalDirection(d.profile)
  if (!dir || !isGood('weightKg', dir, delta) || abs < 0.5 || n < 14) return undefined
  const fat = fatSeries(d.profile, d.measurements)
  const [fatBase, fatLast] = [lastUpTo(fat, base.date), fat.at(-1)]
  const fatDrop = fatBase && fatLast && fatLast.date !== fatBase.date && fatLast.value < fatBase.value ? ` · gordura −${formatDec(fatBase.value - fatLast.value)} pt` : ''
  return {
    kind: 'weight',
    title: `Peso ${delta < 0 ? 'caiu' : 'subiu'} ${formatDec(abs)} kg`,
    detail: `em ${n} dias · ${formatDec(abs / (n / 7), 1)} kg/semana${fatDrop}`,
    trend: delta < 0 ? 'down' : 'up',
  }
}

function streak(d: EvolutionInput, today: string): EvoHighlight | undefined {
  const { current, bestBefore } = goalStreak(d.sessions, weeklyGoal(d.profile.daysPerWeek, d.workoutPlan.workouts.length), today)
  if (current < 2) return undefined
  const detail = current > bestBefore ? 'sua maior sequência até agora' : current === bestBefore ? 'igual ao seu recorde' : `recorde: ${bestBefore} semanas`
  return { kind: 'streak', title: `${current} semanas seguidas batendo a meta`, detail }
}

/** até 3 frases sobre os últimos 30 dias, só notícia boa ou neutra: recorde, peso, sequência */
export const highlights = (d: EvolutionInput, today: string): EvoHighlight[] =>
  [record(d, today), weight(d, today), streak(d, today)].filter((h): h is EvoHighlight => !!h)
