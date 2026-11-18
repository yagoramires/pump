import { todayKey } from '@/lib/date'
import { isObj } from '@/schema'
import { readCurrent, save } from '@/storage/db'
import { upsertMeasurement } from '@/evolution/measurements'
import type { Measurement } from '@/evolution/types'

const FOCUS_OF: Record<string, string> = { hipertrofia: 'hipertrofia', emagrecer: 'hipertrofia', forca: 'forca', saude: 'condicionamento' }
const DIET_OF: Record<string, string> = { emagrecer: 'perder', hipertrofia: 'ganhar' }

/** perfil/medições do formato antigo (objetivo e campos comuns dentro das anamneses, peso no perfil) para o atual; pura e idempotente */
export function migrateData(data: Record<string, unknown>, today: string): Record<string, unknown> {
  if (!isObj(data.profile)) return data
  const { weightKg, anamnesis, dietAnamnesis, ...profile } = data.profile as Record<string, unknown>
  const out: Record<string, unknown> = { ...data, profile }
  const ana = isObj(anamnesis) ? { ...anamnesis } : undefined
  const diet = isObj(dietAnamnesis) ? { ...dietAnamnesis } : undefined
  const lift = (from: Record<string, unknown> | undefined, keys: string[]) => {
    for (const k of keys) {
      if (from && k in from) { if (profile[k] === undefined) profile[k] = from[k]; delete from[k] }
    }
  }
  lift(ana, ['age', 'daysPerWeek', 'notes'])
  lift(diet, ['wake', 'train', 'sleep'])
  const trainGoal = typeof ana?.goal === 'string' ? ana.goal : undefined
  const dietGoal = diet?.goal ?? (trainGoal && DIET_OF[trainGoal])
  if (dietGoal && profile.dietGoal === undefined) profile.dietGoal = dietGoal
  if (trainGoal && FOCUS_OF[trainGoal] && profile.focus === undefined) profile.focus = FOCUS_OF[trainGoal]
  if (ana) { delete ana.goal; profile.anamnesis = ana }
  if (diet) { delete diet.goal; profile.dietAnamnesis = diet }
  if (typeof weightKg === 'number' && weightKg > 0) {
    const ms = Array.isArray(data.measurements) ? (data.measurements as Measurement[]) : []
    if (!ms.some((m) => m.weightKg !== undefined)) {
      const first = isObj(data.settings) && typeof data.settings.firstUseAt === 'string' ? data.settings.firstUseAt : today
      out.measurements = upsertMeasurement(ms, first, { weightKg }).list
    }
  }
  return out
}

export async function migrateStored(): Promise<void> {
  const before = { profile: await readCurrent('profile'), measurements: await readCurrent('measurements'), settings: await readCurrent('settings') }
  const after = migrateData(before, todayKey())
  for (const k of ['profile', 'measurements'] as const) {
    if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) await save(k, after[k] as never)
  }
}

const runs = new WeakMap<Promise<unknown>, Promise<void>>()
/** uma migração só por leitura do perfil (o teste que zera o store recomeça sozinho) */
export const migrationFor = (profileRead: Promise<unknown>): Promise<void> => {
  let p = runs.get(profileRead)
  // escrita que falhou não derruba o app: o cache já tem o valor migrado e a gravação se repete na próxima abertura
  if (!p) { p = migrateStored().catch(() => {}); runs.set(profileRead, p) }
  return p
}
