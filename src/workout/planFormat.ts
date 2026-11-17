import type { CustomExercise, Exercise, Extra, Goal, Level, Muscle, PlanExercise, Place, Profile, Split, WorkoutPlan } from '../types'
import { normalize } from '../catalog/search'
import { formatKg } from '../lib/number'
import { PLAN_DEFAULTS, toPlanExercise } from './templates'

export type Dia = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
export interface PumpExercicio { nome: string; series: number; reps: string; cargaKg?: number; descansoSeg?: number; obs?: string }
export interface PumpTreino { letra: string; nome: string; dias: Dia[]; exercicios: PumpExercicio[] }
export interface PumpPlanoFile { formato: 'pump-plano'; versao: 1; treinos: PumpTreino[]; dieta?: unknown }

export class PlanFormatError extends Error {
  problems: string[]
  constructor(problems: string[]) {
    super(problems.join('\n'))
    this.name = 'PlanFormatError'
    this.problems = problems
  }
}

const DIAS: Dia[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function extractJson(text: string): unknown {
  const fence = text.match(/```[^\n`]*\n?([\s\S]*?)```/)
  const body = fence ? fence[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

export function parsePlanFormat(text: string): PumpPlanoFile {
  const raw = extractJson(text)
  if (!isObj(raw)) throw new PlanFormatError(['Não encontrei um plano em JSON no texto'])
  const problems: string[] = []
  if (raw.formato !== 'pump-plano') problems.push('"formato" precisa ser "pump-plano"')
  if (raw.versao !== 1) problems.push(`Versão ${String(raw.versao)} não suportada (este app lê a versão 1)`)
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
      if (!Number.isInteger(series) || series < 1 || series > 20) problems.push(`${at}: "series" precisa ser um número inteiro de 1 a 20`)
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

  if (problems.length) throw new PlanFormatError(problems)
  return { formato: 'pump-plano', versao: 1, treinos, ...(raw.dieta !== undefined && { dieta: raw.dieta }) }
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
          found = { id: `custom-${crypto.randomUUID()}`, name: x.nome, muscles: [], note: x.obs }
          known.set(key, found) // o mesmo nome sem par reaproveita este
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

export function exportPlanFormat(plan: WorkoutPlan): PumpPlanoFile {
  return {
    formato: 'pump-plano',
    versao: 1,
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
  }
}

const GOALS: Record<Goal, string> = { hipertrofia: 'ganhar massa muscular', emagrecer: 'emagrecer', forca: 'ganhar força', saude: 'saúde e condicionamento' }
const LEVELS: Record<Level, string> = { iniciante: 'iniciante', intermediario: 'intermediário', avancado: 'avançado' }
const PLACES: Record<Place, string> = { academia: 'academia completa', casa: 'em casa, com pouco equipamento' }
const SPLITS: Record<Split, string> = { fullbody: 'full body (corpo todo em cada treino)', ab: 'AB (superiores e inferiores)', abc: 'ABC', abcd: 'ABCD', abcde: 'ABCDE', ppl: 'push/pull/legs (empurrar, puxar, pernas)' }
const MUSCLES: Record<Muscle, string> = { peito: 'peito', costas: 'costas', ombros: 'ombros', biceps: 'bíceps', triceps: 'tríceps', pernas: 'pernas', gluteos: 'glúteos', panturrilha: 'panturrilha' }
const EXTRAS: Record<Extra, string> = { cardio: 'cardio', abdomen: 'abdômen', mobilidade: 'mobilidade/alongamento' }

// backup importado não valida a anamnese: aceita só lista e só valores conhecidos
const names = <T extends string>(v: unknown, labels: Record<T, string>) =>
  Array.isArray(v) ? v.map((x) => labels[x as T]).filter(Boolean).join(', ') : ''

function aboutMe(p?: Profile): string[] {
  const a = p?.anamnesis ?? {}
  return [
    // heightCm > 0 = perfil preenchido; sem ele o sexo é só o valor padrão
    p?.heightCm ? `Sexo: ${p.sex === 'F' ? 'feminino' : 'masculino'}` : '',
    a.age ? `Idade: ${a.age} anos` : '',
    p?.heightCm ? `Altura: ${p.heightCm} cm` : '',
    p?.weightKg ? `Peso: ${formatKg(p.weightKg)} kg` : '',
    // backup importado não valida a anamnese: valor desconhecido viraria "undefined" no prompt
    a.goal && GOALS[a.goal] ? `Objetivo: ${GOALS[a.goal]}` : '',
    a.level && LEVELS[a.level] ? `Nível: ${LEVELS[a.level]}` : '',
    a.place && PLACES[a.place] ? `Onde treino: ${PLACES[a.place]}` : '',
    a.daysPerWeek ? `Dias por semana: ${a.daysPerWeek}` : '',
    a.split && SPLITS[a.split] ? `Divisão preferida: ${SPLITS[a.split]}` : '',
    names(a.extras, EXTRAS) && `Incluir também: ${names(a.extras, EXTRAS)}`,
    names(a.weak, MUSCLES) && `Pontos fracos (quero priorizar): ${names(a.weak, MUSCLES)}`,
    a.minutes ? `Tempo por treino: até ${a.minutes} min${a.extras?.includes('cardio') ? ', contando o cardio' : ''}` : '',
    typeof a.notes === 'string' && a.notes.trim() ? `Lesões, limitações ou preferências: ${a.notes.trim()}` : '',
  ].filter(Boolean).map((l) => `- ${l}`)
}

export const buildPrompt = (profile?: Profile): string => {
  const me = aboutMe(profile)
  return `Você é um personal trainer. Monte meu plano de treino de musculação no formato "Pump".

Sobre mim:
${me.length ? me.join('\n') : '- (ainda não contei nada)'}

Como fazer:
1. Se eu colar uma ficha pronta junto, só transcreva ela pro formato, sem mudar nada.
2. Senão, se faltar algo importante pra montar um bom plano (objetivo, dias por semana, tempo por treino, onde treino, nível, lesões), me pergunte primeiro, tudo numa mensagem só, e espere minha resposta. Nessa hora não mande JSON.
3. Monte o plano pro meu objetivo: escolha séries, repetições e descanso de acordo com ele, use a divisão que prefiro (se eu disse), distribua os treinos nos dias que tenho, dê um pouco mais de volume aos meus pontos fracos e evite exercícios que piorem minhas lesões ou limitações.
4. Cada treino tem que caber no tempo por treino. Some 5 min de aquecimento, o cardio e, pra cada série, uns 40 s de execução mais o descanso. Por exemplo: 60 min com 20 de cardio deixam uns 35 min pra musculação, o que dá umas 12 a 15 séries (4 ou 5 exercícios). Se passar do tempo, corte exercícios ou séries, nunca o descanso.
5. Cardio, abdômen ou mobilidade entram como exercícios do treino; no cardio use "series": 1 e o tempo em "reps", como "20 min".
6. Só coloque "cargaKg" se souber quanto eu levanto; senão deixe de fora.
7. Com o plano pronto, responda SOMENTE com o JSON, sem explicação antes ou depois.

Formato:
- "formato": sempre "pump-plano".
- "versao": sempre 1.
- "treinos": lista com pelo menos um treino. Cada treino tem:
  - "letra": identificador curto e único ("A", "B", "C"...).
  - "nome": nome do treino (ex.: "Peito e tríceps").
  - "dias": lista de dias da semana, entre "seg", "ter", "qua", "qui", "sex", "sab", "dom".
  - "exercicios": lista com pelo menos um exercício. Cada exercício tem:
    - "nome": nome do exercício (obrigatório).
    - "series": número inteiro de 1 a 20 (obrigatório).
    - "reps": repetições como texto, ex.: "8-12" ou "10" (obrigatório).
    - "cargaKg": carga inicial em kg, número maior ou igual a 0 (opcional).
    - "descansoSeg": descanso entre séries em segundos, número inteiro maior ou igual a 0 (opcional).
    - "obs": observação curta (opcional).

Use os nomes dos exercícios como se fala em academia no Brasil (ex.: "supino reto com barra", "puxada frontal com pegada aberta", "rosca direta com barra", "agachamento livre", "leg press").

Exemplo:
\`\`\`json
{
  "formato": "pump-plano",
  "versao": 1,
  "treinos": [
    {
      "letra": "A",
      "nome": "Peito e tríceps",
      "dias": ["seg", "qui"],
      "exercicios": [
        { "nome": "supino reto com barra", "series": 4, "reps": "8-10", "cargaKg": 40, "descansoSeg": 90 },
        { "nome": "tríceps corda", "series": 3, "reps": "12", "obs": "segurar 1s embaixo" }
      ]
    }
  ]
}
\`\`\`

Quando for mandar o plano, responda só com o JSON.`
}
