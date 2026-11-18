import { todayKey } from '@/lib/date'
import { isObj, type Settings } from '@/schema'
import type { DietGoal, Focus, Profile } from './types'
import { readCurrent, save } from '@/storage/db'
import { upsertMeasurement } from '@/evolution/measurements'
import type { Measurement } from '@/evolution/types'

type OldGoal = 'hipertrofia' | 'emagrecer' | 'forca' | 'saude'
const FOCUS_OF: Record<OldGoal, Focus> = { hipertrofia: 'hipertrofia', emagrecer: 'hipertrofia', forca: 'forca', saude: 'condicionamento' }
const DIET_OF: Partial<Record<OldGoal, DietGoal>> = { emagrecer: 'perder', hipertrofia: 'ganhar' }
/** campos que moravam dentro das anamneses e subiram para o perfil */
const LIFT_TRAIN = ['age', 'daysPerWeek', 'notes']
const LIFT_DIET = ['wake', 'train', 'sleep']

const isOldGoal = (g: unknown): g is OldGoal => typeof g === 'string' && Object.hasOwn(FOCUS_OF, g)
const hasAny = (o: unknown, keys: string[]) => isObj(o) && keys.some((k) => k in o)

type Migrated = Omit<StoredData, 'profile'> & { profile?: Profile }
interface StoredData { profile?: unknown; measurements?: Measurement[]; settings?: Partial<Settings> }

/** perfil/medições do formato antigo (objetivo e campos comuns dentro das anamneses, peso no perfil) para o atual; pura e idempotente */
export function migrateData(data: StoredData, today: string): Migrated {
  if (!isObj(data.profile)) return data as Migrated
  const { weightKg, anamnesis, dietAnamnesis, ...profile }: Record<string, unknown> = data.profile
  const legacy = weightKg !== undefined || hasAny(anamnesis, ['goal', ...LIFT_TRAIN]) || hasAny(dietAnamnesis, ['goal', ...LIFT_DIET])
  if (!legacy) return data as Migrated
  const out = { ...data } as Migrated
  const ana = isObj(anamnesis) ? { ...anamnesis } : undefined
  const diet = isObj(dietAnamnesis) ? { ...dietAnamnesis } : undefined
  const lift = (from: Record<string, unknown> | undefined, keys: string[]) => {
    for (const k of keys) {
      if (from && k in from) { if (profile[k] === undefined) profile[k] = from[k]; delete from[k] }
    }
  }
  lift(ana, LIFT_TRAIN)
  lift(diet, LIFT_DIET)
  const trainGoal = isOldGoal(ana?.goal) ? ana.goal : undefined
  const dietGoal = diet?.goal ?? (trainGoal && DIET_OF[trainGoal])
  if (dietGoal && profile.dietGoal === undefined) profile.dietGoal = dietGoal
  if (trainGoal && profile.focus === undefined) profile.focus = FOCUS_OF[trainGoal]
  if (ana) { delete ana.goal; profile.anamnesis = ana }
  if (diet) { delete diet.goal; profile.dietAnamnesis = diet }
  out.profile = profile as unknown as Profile
  if (typeof weightKg === 'number' && weightKg > 0) {
    const ms = data.measurements ?? []
    if (!ms.some((m) => m.weightKg !== undefined)) {
      out.measurements = upsertMeasurement(ms, data.settings?.firstUseAt ?? today, { weightKg }).list
    }
  }
  return out
}

export async function migrateStored(): Promise<void> {
  const before = { profile: await readCurrent('profile'), measurements: await readCurrent('measurements'), settings: await readCurrent('settings') }
  const after = migrateData(before, todayKey())
  // medição antes do perfil: se a gravação da medição falhar, o perfil segue com o peso e a migração se repete
  if (after.measurements && JSON.stringify(after.measurements) !== JSON.stringify(before.measurements)) await save('measurements', after.measurements)
  if (after.profile && JSON.stringify(after.profile) !== JSON.stringify(before.profile)) await save('profile', after.profile)
}

const runs = new WeakMap<Promise<unknown>, Promise<void>>()
/** uma migração por carga do store: a leitura do perfil muda a cada carga (e a cada reset do teste), então serve de chave */
export const migrationFor = (profileRead: Promise<unknown>): Promise<void> => {
  let p = runs.get(profileRead)
  // escrita que falhou não derruba o app: o cache já tem o valor migrado e a gravação se repete na próxima abertura
  if (!p) { p = migrateStored().catch((e) => console.warn('migração do perfil não gravada', e)); runs.set(profileRead, p) }
  return p
}
