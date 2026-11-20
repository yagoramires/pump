import type { EvolutionInput } from './types'
import { isRest } from '@/workout/rest'
import { touched } from '@/diet/day'
import { hasWater } from '@/diet/water'
import type { SupplementLog } from '@/diet/types'

export function dayRecords(d: Pick<EvolutionInput, 'workoutLog' | 'dietLog' | 'waterLog' | 'measurements' | 'photoSets'> & { supplementLog: SupplementLog }, date: string) {
  const s = d.workoutLog[date]
  const diet = d.dietLog[date]
  const water = d.waterLog[date]
  const sups = d.supplementLog[date]
  const r = {
    session: s?.completedAt ? s : undefined,
    rest: isRest(s),
    diet: diet && touched(diet) ? diet : undefined,
    water: hasWater(water) ? water : undefined,
    supplements: sups?.taken.length ? sups : undefined,
    measurement: d.measurements.find((m) => m.date === date),
    photos: d.photoSets.find((p) => p.date === date),
  }
  /** `others`: algo registrado além do treino concluído */
  return { ...r, others: r.rest || !!(r.diet || r.water || r.supplements || r.measurement || r.photos) }
}
