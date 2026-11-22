import { MUSCLE_GROUPS } from '@/catalog/muscles'
import { p2, parseDayKey } from '@/lib/date'
import { formatKg } from '@/lib/number'
import { completedSessions, exerciseHistory } from './stats'
import { hasMarkedSet, markedSets } from './session'
import { isCardio, isTimed, repsNumber } from './reps'
import { trainedDays, weekTrainedDays } from './week'
import type { SessionExercise, SetDone, WorkoutSession } from './types'

export function formatDuration(min: number): string {
  if (min < 1) return '<1 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${p2(min % 60)}`
}

/** exercícios distintos com pelo menos uma série marcada */
export const exerciseCount = (s: WorkoutSession) => new Set(s.exercises.filter(hasMarkedSet).map((e) => e.exerciseId)).size

export const plannedSets = (s: WorkoutSession) => s.exercises.reduce((a, e) => a + e.sets.length, 0)

/** volume só das séries com carga (peso do corpo, cardio e por tempo ficam de fora) e sobre quantas séries feitas ele foi calculado */
export function volumeCoverage(s: WorkoutSession) {
  let kg = 0, counted = 0, total = 0
  for (const e of s.exercises) {
    const loaded = !isCardio(e) && !isTimed(e.reps)
    for (const d of markedSets(e)) {
      total++
      if (loaded && d.weightKg > 0) { counted++; kg += d.weightKg * repsNumber(d.reps) }
    }
  }
  return { kg, counted, total }
}

/** mesma data: quem concluiu antes vem antes */
const isBefore = (a: WorkoutSession, b: WorkoutSession) => a.date < b.date || (a.date === b.date && (a.completedAt ?? '') < (b.completedAt ?? ''))
export const sessionsBefore = (sessions: WorkoutSession[], s: WorkoutSession) => completedSessions(sessions).filter((x) => isBefore(x, s))

type Lift = { kg: number; reps: number }
const lifts = (sets: (SetDone | null)[]): Lift[] => sets.flatMap((d) => (d && d.weightKg > 0 ? [{ kg: d.weightKg, reps: repsNumber(d.reps) }] : []))
const maxRepsAt = (ls: Lift[], kg: number) => Math.max(-Infinity, ...ls.filter((l) => l.kg === kg).map((l) => l.reps))
const maxKg = (ls: Lift[]) => Math.max(0, ...ls.map((l) => l.kg))
const loadsDesc = (ls: Lift[]) => [...new Set(ls.map((l) => l.kg))].sort((a, b) => b - a)

export type Mark =
  | { kind: 'reps'; kg: number; reps: number; prevReps: number }
  | { kind: 'load'; kg: number; reps: number; prevKg: number; prevReps: number }

/** mais reps com uma carga que as duas listas têm (vale a maior carga); senão, mais carga com reps iguais ou maiores */
function beats(today: Lift[], prev: Lift[], loadNeedsReps: boolean): Mark | undefined {
  for (const kg of loadsDesc(today)) {
    const [t, p] = [maxRepsAt(today, kg), maxRepsAt(prev, kg)]
    if (p > -Infinity && t > p) return { kind: 'reps', kg, reps: t, prevReps: p }
  }
  const [tKg, pKg] = [maxKg(today), maxKg(prev)]
  if (pKg <= 0 || tKg <= pKg) return undefined
  const [reps, prevReps] = [maxRepsAt(today, tKg), maxRepsAt(prev, pKg)]
  return !loadNeedsReps || reps >= prevReps ? { kind: 'load', kg: tKg, reps, prevKg: pKg, prevReps } : undefined
}

export type ExerciseMark = { name: string; record?: Mark; improved?: Mark & { date: string } }

/** recorde (contra todo o histórico anterior) ou melhora (contra a última vez) de cada exercício, na ordem do treino; aparições do dia juntas */
export function exerciseMarks(sessions: WorkoutSession[], s: WorkoutSession): Map<string, ExerciseMark> {
  const history = exerciseHistory(sessionsBefore(sessions, s))
  const out = new Map<string, ExerciseMark>()
  for (const e of s.exercises) {
    if (out.has(e.exerciseId) || isCardio(e) || isTimed(e.reps)) continue
    const today = lifts(s.exercises.filter((x) => x.exerciseId === e.exerciseId).flatMap((x) => x.sets))
    const entries = history.get(e.exerciseId) ?? []
    const record = beats(today, lifts(entries.flatMap((x) => x.e.sets)), false)
    const last = entries.at(-1)
    const better = !record && last ? beats(today, lifts(last.e.sets), true) : undefined
    out.set(e.exerciseId, { name: e.name, record, improved: better && last && { ...better, date: last.date } })
  }
  return out
}

export type Highlight =
  | { kind: 'first' }
  | { kind: 'record'; name: string; mark: Mark }
  | { kind: 'goal'; goal: number }
  | { kind: 'improved'; name: string; mark: Mark & { date: string } }
  | { kind: 'neutral' }

export const weekDays = (sessions: WorkoutSession[], s: WorkoutSession) => weekTrainedDays(trainedDays(sessions), s.date)

/** um destaque só: primeiro treino > recorde > meta da semana batida por esta sessão > melhora > neutro */
export function sessionHighlight(sessions: WorkoutSession[], s: WorkoutSession, goal: number): Highlight {
  const before = sessionsBefore(sessions, s)
  if (before.length === 0) return { kind: 'first' }
  const marks = [...exerciseMarks(sessions, s).values()]
  const rec = marks.find((m) => m.record)
  if (rec?.record) return { kind: 'record', name: rec.name, mark: rec.record }
  const firstOfDay = !before.some((x) => x.date === s.date)
  if (firstOfDay && weekTrainedDays(trainedDays(sessions), s.date, s.date) === goal) return { kind: 'goal', goal }
  const imp = marks.find((m) => m.improved)
  if (imp?.improved) return { kind: 'improved', name: imp.name, mark: imp.improved }
  return { kind: 'neutral' }
}

const dayMonth = (key: string) => { const d = parseDayKey(key); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}` }

function markText(m: Mark): string {
  if (m.kind === 'reps') return `${formatKg(m.kg)} kg × ${m.reps} (antes × ${m.prevReps}`
  return `${formatKg(m.kg)} kg × ${m.reps} (antes ${formatKg(m.prevKg)} kg × ${m.prevReps}`
}

/** `loads: false` tira carga e reps (cartão de compartilhar com cargas escondidas) */
export function highlightText(h: Highlight, loads = true): { title: string; detail?: string } {
  switch (h.kind) {
    case 'first': return { title: 'Seu primeiro treino no Pump' }
    case 'goal': return { title: 'Meta da semana batida', detail: `${h.goal} de ${h.goal} treinos` }
    case 'neutral': return { title: 'Treino registrado' }
    case 'record': return { title: h.mark.kind === 'reps' ? 'Recorde de repetições' : 'Recorde de carga', detail: loads ? `${h.name} · ${markText(h.mark)})` : h.name }
    case 'improved': return { title: 'Melhorou desde a última vez', detail: loads ? `${h.name} · ${markText(h.mark)}, em ${dayMonth(h.mark.date)})` : h.name }
  }
}

export const FEELINGS = { leve: 3, medida: 6, puxado: 9 } as const
export type Feeling = keyof typeof FEELINGS
export const FEELING_LABEL: Record<Feeling, string> = { leve: 'Leve', medida: 'Na medida', puxado: 'Puxado' }
/** esforço antigo (1 a 10) lido por faixa: 1–4 leve, 5–7 na medida, 8–10 puxado */
export const feelingOf = (n?: number): Feeling | undefined => (n === undefined ? undefined : n <= 4 ? 'leve' : n <= 7 ? 'medida' : 'puxado')

export type MuscleLevel = 'primary' | 'secondary'
const MUSCLE_ORDER = [...MUSCLE_GROUPS.keys()]

/** músculos dos exercícios (filtre antes os feitos, se for o caso); principal em qualquer exercício vence. Plano antigo sem `primary`: catálogo, ou o 1º músculo (o catálogo grava os principais primeiro) */
export function muscleLevels(exercises: Pick<SessionExercise, 'exerciseId' | 'muscles' | 'primary' | 'custom'>[], catalogPrimary?: Map<string, string[]>): Map<string, MuscleLevel> {
  const levels = new Map<string, MuscleLevel>()
  for (const e of exercises) {
    const primary = e.custom ? e.muscles : (e.primary ?? catalogPrimary?.get(e.exerciseId) ?? e.muscles.slice(0, 1))
    for (const m of e.muscles) {
      if (primary.includes(m)) levels.set(m, 'primary')
      else if (!levels.has(m)) levels.set(m, 'secondary')
    }
  }
  return new Map([...levels].sort(([a], [b]) => MUSCLE_ORDER.indexOf(a) - MUSCLE_ORDER.indexOf(b)))
}

export const primaryMuscles = (levels: Map<string, MuscleLevel>) => [...levels].filter(([, l]) => l === 'primary').map(([m]) => m)
