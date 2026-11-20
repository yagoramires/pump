import { omitKey } from '@/lib/utils'
import type { Supplement, SupplementLog } from './types'

const setDay = (log: SupplementLog, date: string, taken: string[], total: number): SupplementLog =>
  taken.length ? { ...log, [date]: { taken, total } } : omitKey(log, date)

export const toggleSupplement = (log: SupplementLog, date: string, id: string, total: number): SupplementLog => {
  const taken = log[date]?.taken ?? []
  return setDay(log, date, taken.includes(id) ? taken.filter((t) => t !== id) : [...taken, id], total)
}

export const syncToday = (log: SupplementLog, date: string, list: Supplement[]): SupplementLog => {
  const day = log[date]
  if (!day) return log
  return setDay(log, date, day.taken.filter((t) => list.some((s) => s.id === t)), list.length)
}

export const removeSupplementDay = (log: SupplementLog, date: string): SupplementLog => omitKey(log, date)

export const supplementSub = (s: Supplement) => [s.dose, s.when].filter(Boolean).join(' · ')
