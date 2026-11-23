import type { Exercise, TacoFood } from '@/catalog/types'
import type { DietPlan } from '@/diet/types'
import type { WorkoutPlan } from '@/workout/types'
import { dietaOf, dietFromFormat, parseDietFormat } from '@/diet/dietFormat'
import { preparePlan } from '@/diet/plan'
import { parsePlanFormat, planFromFormat, treinosOf } from '@/workout/planFormat'
import { todayKey } from '@/lib/date'
import { FROM_PUMP, FormatError, halvesIn, writeEnvelope } from './envelope'

/** o arquivo que o Pump exporta pra editar fora (no computador) e importar de volta: uma ou as duas metades */
export type PlanFile = { workout?: WorkoutPlan; diet?: DietPlan }

export const planFileText = ({ workout, diet }: PlanFile): string =>
  writeEnvelope({ ...FROM_PUMP, ...(workout && { treinos: treinosOf(workout) }), ...(diet && { dieta: dietaOf(preparePlan(diet)) }) })

/** o que os seletores de arquivo aceitam: o .json exportado, ou o texto que a IA mandou */
export const PLAN_FILE_ACCEPT = '.json,application/json,text/plain'

export const planFileOf = (p: PlanFile): File => new File([planFileText(p)], planFileName(p), { type: 'application/json' })

export function planFileName({ workout, diet }: PlanFile, now = new Date()): string {
  const kind = workout && diet ? 'plano' : workout ? 'treino' : 'dieta'
  return `pump-${kind}-${todayKey(now)}.json`
}

/** sem catálogo (offline) os exercícios voltam como "próprios" e os alimentos com os valores do arquivo */
export async function readPlanFile(
  text: string,
  load: { exercises: () => Promise<Exercise[] | null>; taco: () => Promise<TacoFood[] | null> },
): Promise<PlanFile> {
  const halves = halvesIn(text)
  if (!halves.length) throw new FormatError(['Não encontrei um plano do Pump no arquivo'])
  const file: PlanFile = {}
  if (halves.includes('treinos')) file.workout = planFromFormat(parsePlanFormat(text), await load.exercises(), []).plan
  if (halves.includes('dieta')) file.diet = dietFromFormat(parseDietFormat(text), await load.taco(), []).plan
  return file
}
