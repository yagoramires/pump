import type { DietItem, DietPlan, TacoFood } from '../types'
import { extractJson, PlanFormatError } from '../workout/planFormat'
import { matchFood } from './match'

export interface PumpAlimento { nome: string; gramas: number; porcao?: string; kcal?: number; proteinaG?: number; carboG?: number; gorduraG?: number }
export interface PumpRefeicao { nome: string; horario: string; alimentos: PumpAlimento[] }
export interface PumpDieta { metaKcal?: number; macros?: { proteinaG: number; carboG: number; gorduraG: number }; refeicoes: PumpRefeicao[] }

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const VALUES = ['kcal', 'proteinaG', 'carboG', 'gorduraG'] as const

export function parseDietFormat(text: string): PumpDieta {
  const raw = extractJson(text)
  if (!isObj(raw)) throw new PlanFormatError(['Não encontrei um cardápio em JSON no texto'])
  if (!isObj(raw.dieta)) throw new PlanFormatError(['Este arquivo não tem dieta.'])
  const d = raw.dieta
  const problems: string[] = []
  const list = Array.isArray(d.refeicoes) ? d.refeicoes : []
  if (list.length === 0) problems.push('Cardápio sem refeições')
  if (list.length > 10) problems.push('Cardápio com mais de 10 refeições')
  const metaKcal = d.metaKcal ?? undefined
  if (metaKcal !== undefined && !(Number.isInteger(metaKcal) && num(metaKcal, 800, 6000))) problems.push('metaKcal fora da faixa (800 a 6000)')
  const m = isObj(d.macros) ? d.macros : undefined
  if (d.macros != null && !(m && num(m.proteinaG, 0, 600) && num(m.carboG, 0, 600) && num(m.gorduraG, 0, 600))) problems.push('macros fora da faixa (0 a 600)')

  const refeicoes = list.map((r: unknown, n): PumpRefeicao => {
    const o = isObj(r) ? r : {}
    const tag = `Refeição ${n + 1}`
    const nome = str(o.nome)
    if (!nome) problems.push(`${tag}: falta o nome`)
    const horario = str(o.horario)
    if (!HHMM.test(horario)) problems.push(`${tag}: horário inválido (use HH:MM)`)
    const foods = Array.isArray(o.alimentos) ? o.alimentos : []
    if (foods.length === 0) problems.push(`${tag}: sem alimentos`)
    if (foods.length > 30) problems.push(`${tag}: mais de 30 alimentos`)
    const alimentos = foods.map((a: unknown, i): PumpAlimento => {
      const x = isObj(a) ? a : {}
      const at = `${tag}, alimento ${i + 1}`
      const nome = str(x.nome)
      if (!nome) problems.push(`${at}: falta o nome`)
      const gramas = x.gramas as number
      if (!num(gramas, 1, 2000)) problems.push(`${at}: gramas inválidas`)
      const porcao = str(x.porcao)
      const out: PumpAlimento = { nome, gramas, ...(porcao && { porcao }) }
      // valor fora do formato é só descartado: o item continua e fica "sem valores" se faltar a kcal
      for (const k of VALUES) if (num(x[k], 0, Infinity)) out[k] = x[k] as number
      if (out.kcal !== undefined && (out.kcal * 100) / gramas > 900) delete out.kcal
      return out
    })
    return { nome, horario, alimentos }
  })

  if (problems.length) throw new PlanFormatError(problems)
  return {
    ...(metaKcal !== undefined && { metaKcal: metaKcal as number }),
    ...(m && { macros: { proteinaG: m.proteinaG as number, carboG: m.carboG as number, gorduraG: m.gorduraG as number } }),
    refeicoes,
  }
}

type Match = 'custom' | 'exact' | 'words' | 'ia' | 'none'

export function dietFromFormat(
  d: PumpDieta,
  taco: TacoFood[] | null,
  customs: DietItem[],
): { plan: DietPlan; items: { mealIdx: number; itemIdx: number; match: Match; aiName: string }[]; offline: boolean } {
  const items: { mealIdx: number; itemIdx: number; match: Match; aiName: string }[] = []
  const meals = d.refeicoes.map((r, mealIdx) => ({
    id: crypto.randomUUID(),
    name: r.nome,
    time: r.horario,
    items: r.alimentos.map((a, itemIdx): DietItem => {
      const base = { id: crypto.randomUUID(), grams: a.gramas, ...(a.porcao && { portion: a.porcao }) }
      const found = matchFood(a.nome, a.gramas, a.kcal, taco ?? [], customs)
      let match: Match
      let item: DietItem
      if (found?.kind === 'custom') {
        const { portion: _, ...mine } = found.item
        match = 'custom'
        item = { ...mine, ...base }
      } else if (found) {
        const { id: tacoId, name, kcal, p, c, f } = found.food
        match = found.kind
        item = { ...base, name, per100: { kcal, p, c, f }, source: 'taco', tacoId }
      } else {
        // valores da IA são da quantidade; guardamos por 100 g
        const per = (v = 0) => (v * 100) / a.gramas
        match = a.kcal === undefined ? 'none' : 'ia'
        item = { ...base, name: a.nome, per100: a.kcal === undefined ? { kcal: 0, p: 0, c: 0, f: 0 } : { kcal: per(a.kcal), p: per(a.proteinaG), c: per(a.carboG), f: per(a.gorduraG) }, source: 'ia' }
      }
      items.push({ mealIdx, itemIdx, match, aiName: a.nome })
      return item
    }),
  }))
  const plan: DietPlan = {
    meals,
    ...(d.metaKcal !== undefined && { goalKcal: d.metaKcal }),
    ...(d.macros && { goalMacros: { p: d.macros.proteinaG, c: d.macros.carboG, f: d.macros.gorduraG } }),
  }
  return { plan, items, offline: taco === null }
}

const r1 = (v: number) => Math.round(v * 10) / 10

export function exportDietFormat(plan: DietPlan): string {
  return JSON.stringify({
    formato: 'pump-plano',
    versao: 1,
    dieta: {
      ...(plan.goalKcal !== undefined && { metaKcal: plan.goalKcal }),
      ...(plan.goalMacros && { macros: { proteinaG: plan.goalMacros.p, carboG: plan.goalMacros.c, gorduraG: plan.goalMacros.f } }),
      refeicoes: plan.meals.map((m) => ({
        nome: m.name,
        horario: m.time,
        alimentos: m.items.map((i) => {
          const q = i.grams / 100
          return {
            nome: i.name,
            gramas: i.grams,
            ...(i.portion && { porcao: i.portion }),
            kcal: Math.round(i.per100.kcal * q),
            proteinaG: r1(i.per100.p * q),
            carboG: r1(i.per100.c * q),
            gorduraG: r1(i.per100.f * q),
          }
        }),
      })),
    },
  }, null, 2)
}
