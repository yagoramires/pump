import type { EvolutionInput } from './types'
import { isRest } from '@/workout/rest'
import { touched } from '@/diet/day'
import { hasWater } from '@/diet/water'
import type { SupplementLog } from '@/diet/types'
import type { WorkoutLog } from '@/workout/types'

export function dayRecords(d: Pick<EvolutionInput, 'dietLog' | 'waterLog' | 'measurements' | 'photoSets'> & { workoutLog: WorkoutLog; extraLog: WorkoutLog; supplementLog: SupplementLog }, date: string) {
  const s = d.workoutLog[date]
  const x = d.extraLog[date]
  const diet = d.dietLog[date]
  const water = d.waterLog[date]
  const sups = d.supplementLog[date]
  const extra = x?.completedAt ? x : undefined
  const r = {
    session: s?.completedAt ? s : undefined,
    extra,
    // treinou mesmo no dia de descanso: o dia vale como treino
    rest: isRest(s) && !extra,
    diet: diet && touched(diet) ? diet : undefined,
    water: hasWater(water) ? water : undefined,
    supplements: sups?.taken.length ? sups : undefined,
    measurement: d.measurements.find((m) => m.date === date),
    photos: d.photoSets.find((p) => p.date === date),
  }
  /** `others`: algo registrado além do treino concluído */
  return { ...r, others: r.rest || !!(r.diet || r.water || r.supplements || r.measurement || r.photos) }
}
