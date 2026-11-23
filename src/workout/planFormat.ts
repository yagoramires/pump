import type { CustomExercise, Exercise, PlanExercise, Workout, WorkoutPlan } from './types'
import { normalize, str } from '@/lib/text'
import { splitExerciseLine } from '@/catalog/exerciseLine'
import { FROM_PUMP, FormatError, headerProblems, readHalf, writeEnvelope } from '@/format/envelope'
import { isObj } from '@/lib/utils'
import { inRange } from '@/lib/number'
import { KG, REST_SEC, SETS } from './limits'
import { PLAN_DEFAULTS, newCustomExercise, toPlanExercise } from './exercises'

const PLAN_NOT_FOUND = 'Não encontrei um plano em JSON no texto'

interface PumpExercicio { nome: string; series: number; reps: string; cargaKg?: number; descansoSeg?: number; obs?: string }
interface PumpTreino { letra: string; nome: string; exercicios: PumpExercicio[] }
type PumpPlano = { treinos: PumpTreino[]; ignoredDiet: boolean; fromPump?: boolean }

type DraftRule = 'name' | 'empty' | 'reps'
type Problem = (text: string, rule?: DraftRule, exercise?: number) => void

function parseTreino(t: unknown, n: number, seen: Set<string>, problem: Problem): PumpTreino {
  const o = isObj(t) ? t : {}
  const letra = str(o.letra)
  const id = letra || String(n + 1)
  const tag = `Treino ${id}`
  if (!letra) problem(`Treino ${n + 1}: "letra" vazia`)
  else if (seen.has(letra)) problem(`${tag}: "letra" repetida`)
  seen.add(letra)
  const nome = str(o.nome)
  if (!nome) problem(`${tag}: "nome" vazio`, 'name')
  const exs = Array.isArray(o.exercicios) ? o.exercicios : []
  if (exs.length === 0) problem(`${tag}: precisa ter pelo menos um exercício`, 'empty')
  const exercicios = exs.map((e: unknown, i): PumpExercicio => {
    const x = isObj(e) ? e : {}
    const at = `${tag}, exercício ${i + 1}`
    const nome = str(x.nome)
    if (!nome) problem(`${at}: "nome" vazio`)
    const series = x.series as number
    if (!(Number.isInteger(series) && inRange(series, ...SETS))) problem(`${at}: "series" precisa ser um número inteiro de ${SETS[0]} a ${SETS[1]}`)
    const reps = typeof x.reps === 'number' ? String(x.reps) : str(x.reps)
    if (!reps) problem(`${at}: "reps" vazio`, 'reps', i)
    const carga = x.cargaKg as number | undefined
    if (carga != null && !inRange(carga, ...KG)) problem(`${at}: "cargaKg" precisa ser um número de ${KG[0]} a ${KG[1]}`)
    const desc = x.descansoSeg as number | undefined
    if (desc != null && !(Number.isInteger(desc) && inRange(desc, ...REST_SEC))) problem(`${at}: "descansoSeg" precisa ser um número inteiro de ${REST_SEC[0]} a ${REST_SEC[1]}`)
    const obs = str(x.obs)
    return { nome, series, reps, ...(carga != null && { cargaKg: carga }), ...(desc != null && { descansoSeg: desc }), ...(obs && { obs }) }
  })
  return { letra, nome, exercicios }
}

export const parsePlanFormat = (text: string): PumpPlano => readHalf(text, 'treinos', PLAN_NOT_FOUND, (raw, ignoredDiet) => {
  const problems = headerProblems(raw)
  const list = Array.isArray(raw.treinos) ? raw.treinos : []
  if (list.length === 0) problems.push('"treinos" precisa ter pelo menos um treino')
  const seen = new Set<string>()
  const treinos = list.map((t: unknown, n) => parseTreino(t, n, seen, (text) => problems.push(text)))
  if (problems.length) throw new FormatError(problems)
  return { treinos, ignoredDiet, ...(raw.origem === FROM_PUMP.origem && { fromPump: true }) }
})

// a lista do catálogo traz "nome (equipamento)": só aceita o nome sem o parêntese final se ele for o equipamento do exercício achado
// (só do catálogo: um exercício seu com o mesmo nome base não pode esconder a variante)
function withEquipment(nome: string, catalog: Map<string, Exercise>): Exercise | undefined {
  const { name, equipment } = splitExerciseLine(nome)
  const e = catalog.get(normalize(name))
  return e && equipment !== undefined && normalize(e.equipment) === normalize(equipment) ? e : undefined
}

export function planFromFormat(
  f: PumpPlano,
  catalog: Exercise[] | null,
  customs: CustomExercise[],
): { plan: WorkoutPlan; newCustoms: CustomExercise[]; offline: boolean; ignoredDiet: boolean } {
  const known = new Map<string, Exercise | CustomExercise>()
  const fromCatalog = new Map<string, Exercise>()
  for (const e of catalog ?? []) if (!fromCatalog.has(normalize(e.name))) fromCatalog.set(normalize(e.name), e)
  for (const e of [...customs, ...catalog ?? []]) if (!known.has(normalize(e.name))) known.set(normalize(e.name), e)
  const newCustoms: CustomExercise[] = []

  const plan: WorkoutPlan = {
    workouts: f.treinos.map((t) => ({
      id: crypto.randomUUID(),
      label: t.letra,
      name: t.nome,
      exercises: t.exercicios.map((x): PlanExercise => {
        const key = normalize(x.nome)
        // arquivo do Pump volta como saiu: "Supino (barra)" próprio não vira o "Supino" do catálogo
        let found = known.get(key) ?? (f.fromPump ? undefined : withEquipment(x.nome, fromCatalog))
        if (!found) {
          found = newCustomExercise(x.nome, [], x.obs)
          known.set(key, found)
          newCustoms.push(found)
        }
        return {
          ...toPlanExercise(found),
          sets: x.series,
          reps: x.reps,
          weightKg: x.cargaKg ?? PLAN_DEFAULTS.weightKg,
          restSec: x.descansoSeg ?? PLAN_DEFAULTS.restSec,
          ...(x.obs && { note: x.obs }),
        }
      }),
    })),
  }
  // sem catálogo tudo vira "próprio": guardar esses em customExercises esconderia o exercício do catálogo nas próximas importações
  const offline = catalog === null
  return { plan, newCustoms: offline ? [] : newCustoms, offline, ignoredDiet: f.ignoredDiet }
}

const encodeTreino = (w: Workout): PumpTreino => ({
  letra: w.label,
  nome: w.name,
  exercicios: w.exercises.map((e) => ({
    nome: e.name,
    series: e.sets,
    reps: e.reps,
    cargaKg: e.weightKg,
    descansoSeg: e.restSec,
    ...(e.note && { obs: e.note }),
  })),
})

export const treinosOf = (plan: WorkoutPlan): PumpTreino[] => plan.workouts.map(encodeTreino)

export const exportPlanFormat = (plan: WorkoutPlan): string => writeEnvelope({ treinos: treinosOf(plan) })

/** o que o editor não deixa salvar: as mesmas regras da importação (o "Ajustar com IA" reimporta), no texto do editor */
export function planProblem(plan: WorkoutPlan): string | undefined {
  const seen = new Set<string>()
  for (const [n, w] of plan.workouts.entries()) {
    let first: string | undefined
    parseTreino(encodeTreino(w), n, seen, (text, rule, i = 0) => {
      first ??= rule === 'name' ? `Treino ${w.label}: dê um nome ao treino`
        : rule === 'empty' ? `Treino ${w.label}: adicione pelo menos um exercício`
        : rule === 'reps' ? `Treino ${w.label}, ${w.exercises[i].name}: preencha as repetições`
        : text
    })
    if (first) return first
  }
}
