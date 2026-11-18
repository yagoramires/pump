import type { DietDay, DietItem } from '../src/diet/types'
import type { Exercise, PlanExercise, Workout, WorkoutPlan } from '../src/workout/types'
import type { EvolutionInput } from '../src/evolution/types'
import { PREVIEW_CACHE } from '../src/catalog/urls'
import { DEFAULTS } from '../src/schema'

export const pe = (over: Partial<PlanExercise> = {}): PlanExercise => ({
  exerciseId: 'X', name: 'X', muscles: [], images: [], instructions: [], sets: 3, reps: '10', weightKg: 0, restSec: 90, ...over,
})

export const workoutOf = (exs: Partial<PlanExercise>[], over: Partial<Workout> = {}): Workout => ({
  id: 'w', label: 'A', name: 'Treino A', weekdays: [1], exercises: exs.map(pe), ...over,
})

export const planOf = (ws: Partial<Workout>[]): WorkoutPlan => ({
  workouts: ws.map((w) => workoutOf([], w)),
})

export const planWith = (exs: Partial<PlanExercise>[]): WorkoutPlan => ({ workouts: [workoutOf(exs)] })

export const ex = (name: string, over: Partial<Exercise> = {}): Exercise => ({
  id: name, name, muscles: [], equipment: 'barra', instructions: [], images: [], ...over,
})

export const fakeCacheStorage = (initial: Record<string, string>, opts: { failOn?: string } = {}): CacheStorage => {
  const store = new Map(Object.entries(initial))
  const cache = {
    keys: async () => [...store.keys()].map((url) => ({ url })),
    add: async (url: string) => {
      if (url === opts.failOn) throw new Error('falhou')
      store.set(url, 'ok')
    },
    delete: async (req: string | { url: string }) => store.delete(typeof req === 'string' ? req : req.url),
    match: async (url: string) => (store.has(url) ? { url } : undefined),
  }
  return { open: async () => cache } as unknown as CacheStorage
}

export const cachedUrls = async (cs: CacheStorage): Promise<string[]> =>
  (await (await cs.open(PREVIEW_CACHE)).keys()).map((r) => r.url).sort()

export const food = (over: Partial<DietItem> = {}): DietItem => ({ id: 'f', name: 'Arroz', grams: 100, per100: { kcal: 200, p: 5, c: 40, f: 1 }, source: 'taco', ...over })

/** uma refeição de 200 kcal por entrada; true = marcada */
export const dietDay = (done: boolean[], over: Partial<DietDay> = {}): DietDay => ({
  menuId: 'm', menuName: 'Padrão', goalKcal: 2000,
  meals: done.map((d, i) => ({ id: `r${i}`, name: `Refeição ${i + 1}`, time: `0${i}:00`, done: d, items: [food({ id: `i${i}` })] })),
  ...over,
})

export const evolutionInput = (over: Partial<EvolutionInput> = {}): EvolutionInput => ({
  workoutLog: DEFAULTS.workoutLog, workoutPlan: DEFAULTS.workoutPlan, measurements: DEFAULTS.measurements, photoSets: DEFAULTS.photoSets,
  profile: DEFAULTS.profile, dietLog: DEFAULTS.dietLog, waterLog: DEFAULTS.waterLog, dietPlan: DEFAULTS.dietPlan, ...over,
})
