import type { CustomExercise, Exercise, PlanExercise, WorkoutPlan } from './types'
import { normalize } from '@/catalog/search'
import { FormatError, headerProblems, readEnvelope, str, writeEnvelope, HEADER } from '@/format/envelope'
import { isObj } from '@/schema'
import { SETS } from './limits'
import { PLAN_DEFAULTS, newCustomExercise, toPlanExercise } from './exercises'

type Dia = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
interface PumpExercicio { nome: string; series: number; reps: string; cargaKg?: number; descansoSeg?: number; obs?: string }
interface PumpTreino { letra: string; nome: string; dias: Dia[]; exercicios: PumpExercicio[] }
export type PumpPlanoFile = typeof HEADER & { treinos: PumpTreino[]; dieta?: unknown }

const DIAS: Dia[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
export function parsePlanFormat(text: string): PumpPlanoFile {
  const raw = readEnvelope(text, 'Não encontrei um plano em JSON no texto')
  if (raw.dieta !== undefined && raw.treinos === undefined) throw new FormatError(['Este arquivo só tem dieta. Importe na aba Dieta.'])
  const problems = headerProblems(raw)
  const list = Array.isArray(raw.treinos) ? raw.treinos : []
  if (list.length === 0) problems.push('"treinos" precisa ter pelo menos um treino')

  const seen = new Set<string>()
  const treinos = list.map((t: unknown, n): PumpTreino => {
    const o = isObj(t) ? t : {}
    const letra = str(o.letra)
    const id = letra || String(n + 1)
    const tag = `Treino ${id}`
    if (!letra) problems.push(`Treino ${n + 1}: "letra" vazia`)
    else if (seen.has(letra)) problems.push(`${tag}: "letra" repetida`)
    seen.add(letra)
    const nome = str(o.nome)
    if (!nome) problems.push(`${tag}: "nome" vazio`)
    const dias: Dia[] = []
    for (const d of Array.isArray(o.dias) ? o.dias : []) {
      const k = (typeof d === 'string' ? d.trim().toLowerCase().replace('sáb', 'sab') : '') as Dia
      if (DIAS.includes(k)) dias.push(k)
      else problems.push(`${tag}: dia "${String(d)}" inválido (use seg, ter, qua, qui, sex, sab, dom)`)
    }
    const exs = Array.isArray(o.exercicios) ? o.exercicios : []
    if (exs.length === 0) problems.push(`${tag}: precisa ter pelo menos um exercício`)
    const exercicios = exs.map((e: unknown, i): PumpExercicio => {
      const x = isObj(e) ? e : {}
      const at = `${tag}, exercício ${i + 1}`
      const nome = str(x.nome)
      if (!nome) problems.push(`${at}: "nome" vazio`)
      const series = x.series as number
      if (!Number.isInteger(series) || series < SETS[0] || series > SETS[1]) problems.push(`${at}: "series" precisa ser um número inteiro de ${SETS[0]} a ${SETS[1]}`)
      const reps = typeof x.reps === 'number' ? String(x.reps) : str(x.reps)
      if (!reps) problems.push(`${at}: "reps" vazio`)
      const carga = x.cargaKg as number | undefined
      if (carga != null && !(Number.isFinite(carga) && carga >= 0)) problems.push(`${at}: "cargaKg" precisa ser um número maior ou igual a 0`)
      const desc = x.descansoSeg as number | undefined
      if (desc != null && !(Number.isInteger(desc) && desc >= 0)) problems.push(`${at}: "descansoSeg" precisa ser um número inteiro maior ou igual a 0`)
      const obs = str(x.obs)
      return { nome, series, reps, ...(carga != null && { cargaKg: carga }), ...(desc != null && { descansoSeg: desc }), ...(obs && { obs }) }
    })
    return { letra, nome, dias, exercicios }
  })

  if (problems.length) throw new FormatError(problems)
  return { ...HEADER, treinos, ...(raw.dieta !== undefined && { dieta: raw.dieta }) }
}

export function planFromFormat(
  f: PumpPlanoFile,
  catalog: Exercise[],
  customs: CustomExercise[],
): { plan: WorkoutPlan; newCustoms: CustomExercise[]; unmatched: string[]; ignoredDiet: boolean } {
  const known = new Map<string, Exercise | CustomExercise>()
  for (const e of [...customs, ...catalog]) if (!known.has(normalize(e.name))) known.set(normalize(e.name), e)
  const newCustoms: CustomExercise[] = []
  const unmatched: string[] = []

  const plan: WorkoutPlan = {
    workouts: f.treinos.map((t) => ({
      id: crypto.randomUUID(),
      label: t.letra,
      name: t.nome,
      weekdays: t.dias.map((d) => DIAS.indexOf(d)),
      exercises: t.exercicios.map((x): PlanExercise => {
        const key = normalize(x.nome)
        let found = known.get(key)
        if (!found) {
          found = newCustomExercise(x.nome, [], x.obs)
          known.set(key, found)
          newCustoms.push(found)
          unmatched.push(x.nome)
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
  return { plan, newCustoms, unmatched, ignoredDiet: f.dieta !== undefined }
}

export function exportPlanFormat(plan: WorkoutPlan): string {
  return writeEnvelope({
    treinos: plan.workouts.map((w) => ({
      letra: w.label,
      nome: w.name,
      dias: w.weekdays.map((d) => DIAS[d]),
      exercicios: w.exercises.map((e) => ({
        nome: e.name,
        series: e.sets,
        reps: e.reps,
        cargaKg: e.weightKg,
        descansoSeg: e.restSec,
        ...(e.note && { obs: e.note }),
      })),
    })),
  })
}
