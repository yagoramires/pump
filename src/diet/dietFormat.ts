import type { DietItem, DietPlan, Menu, TacoFood } from './types'
import { extractJson, PlanFormatError } from '../workout/planFormat'
import { matchFood } from './match'

export interface PumpAlimento { nome: string; gramas: number; porcao?: string; kcal?: number; proteinaG?: number; carboG?: number; gorduraG?: number }
export interface PumpOpcao { nome?: string; alimentos: PumpAlimento[] }
export interface PumpRefeicao { nome: string; horario: string; opcoes: PumpOpcao[] }
export interface PumpMacros { proteinaG: number; carboG: number; gorduraG: number }
export interface PumpCardapio { nome: string; metaKcal?: number; macros?: PumpMacros; refeicoes: PumpRefeicao[] }
export interface PumpDieta { cardapios: PumpCardapio[] }

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const VALUES = ['kcal', 'proteinaG', 'carboG', 'gorduraG'] as const

function parseFoods(v: unknown, tag: string, problems: string[]): PumpAlimento[] {
  const foods = Array.isArray(v) ? v : []
  if (foods.length === 0) problems.push(`${tag}: sem alimentos`)
  if (foods.length > 30) problems.push(`${tag}: mais de 30 alimentos`)
  return foods.map((a: unknown, i): PumpAlimento => {
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
}

function parseMeal(r: unknown, tag: string, problems: string[]): PumpRefeicao {
  const o = isObj(r) ? r : {}
  const nome = str(o.nome)
  if (!nome) problems.push(`${tag}: falta o nome`)
  const horario = str(o.horario).padStart(5, '0') // "7:00" → "07:00"
  if (!HHMM.test(horario)) problems.push(`${tag}: horário inválido (use HH:MM)`)
  // refeição com "alimentos" direto é uma opção só
  if (!Array.isArray(o.opcoes)) return { nome, horario, opcoes: [{ alimentos: parseFoods(o.alimentos, tag, problems) }] }
  if (o.opcoes.length === 0) problems.push(`${tag}: sem opções`)
  if (o.opcoes.length > 4) problems.push(`${tag}: mais de 4 opções`)
  const opcoes = o.opcoes.map((op: unknown, i): PumpOpcao => {
    const x = isObj(op) ? op : {}
    const opNome = str(x.nome)
    return { ...(opNome && { nome: opNome }), alimentos: parseFoods(x.alimentos, `${tag}, opção ${i + 1}`, problems) }
  })
  return { nome, horario, opcoes }
}

/** `c` = número do cardápio quando o arquivo usa "cardapios"; sem ele, as mensagens são as do formato de um cardápio só */
function parseMenu(d: Obj, c: number | undefined, problems: string[]): PumpCardapio {
  const pre = c === undefined ? '' : `Cardápio ${c}: `
  const nome = c === undefined ? 'Cardápio' : str(d.nome)
  if (!nome) problems.push(`${pre}falta o nome`)
  const list = Array.isArray(d.refeicoes) ? d.refeicoes : []
  if (list.length === 0) problems.push(c === undefined ? 'Cardápio sem refeições' : `${pre}sem refeições`)
  if (list.length > 10) problems.push(c === undefined ? 'Cardápio com mais de 10 refeições' : `${pre}mais de 10 refeições`)
  const metaKcal = d.metaKcal ?? undefined
  if (metaKcal !== undefined && !(Number.isInteger(metaKcal) && num(metaKcal, 800, 6000))) problems.push(`${pre}metaKcal fora da faixa (800 a 6000)`)
  const m = isObj(d.macros) ? d.macros : undefined
  if (d.macros != null && !(m && num(m.proteinaG, 0, 600) && num(m.carboG, 0, 600) && num(m.gorduraG, 0, 600))) problems.push(`${pre}macros fora da faixa (0 a 600)`)
  const refeicoes = list.map((r: unknown, n) => parseMeal(r, c === undefined ? `Refeição ${n + 1}` : `Cardápio ${c}, refeição ${n + 1}`, problems))
  return {
    nome,
    ...(metaKcal !== undefined && { metaKcal: metaKcal as number }),
    ...(m && { macros: { proteinaG: m.proteinaG as number, carboG: m.carboG as number, gorduraG: m.gorduraG as number } }),
    refeicoes,
  }
}

export function parseDietFormat(text: string): PumpDieta {
  const raw = extractJson(text)
  if (!isObj(raw)) throw new PlanFormatError(['Não encontrei um cardápio em JSON no texto'])
  if (!isObj(raw.dieta)) throw new PlanFormatError(['Este arquivo não tem dieta.'])
  const d = raw.dieta
  const problems: string[] = []
  let cardapios: PumpCardapio[]
  if (Array.isArray(d.cardapios)) {
    if (d.cardapios.length === 0) problems.push('Dieta sem cardápios')
    if (d.cardapios.length > 5) problems.push('Mais de 5 cardápios')
    cardapios = d.cardapios.map((x: unknown, i) => parseMenu(isObj(x) ? x : {}, i + 1, problems))
  } else cardapios = [parseMenu(d, undefined, problems)]
  if (problems.length) throw new PlanFormatError(problems)
  return { cardapios }
}

type Match = 'custom' | 'exact' | 'words' | 'ia' | 'none'
type ItemReport = { menuIdx: number; mealIdx: number; optionIdx: number; itemIdx: number; match: Match; aiName: string }

function itemFromFormat(a: PumpAlimento, taco: TacoFood[] | null, customs: DietItem[]): { item: DietItem; match: Match } {
  const base = { id: crypto.randomUUID(), grams: a.gramas, ...(a.porcao && { portion: a.porcao }) }
  const found = matchFood(a.nome, a.gramas, a.kcal, taco ?? [], customs)
  if (found?.kind === 'custom') {
    const { portion: _, ...mine } = found.item
    return { match: 'custom', item: { ...mine, ...base } }
  }
  if (found) {
    const { id: tacoId, name, kcal, p, c, f } = found.food
    return { match: found.kind, item: { ...base, name, per100: { kcal, p, c, f }, source: 'taco', tacoId } }
  }
  // valores da IA são da quantidade; guardamos por 100 g
  const per = (v = 0) => (v * 100) / a.gramas
  return {
    match: a.kcal === undefined ? 'none' : 'ia',
    item: { ...base, name: a.nome, per100: a.kcal === undefined ? { kcal: 0, p: 0, c: 0, f: 0 } : { kcal: per(a.kcal), p: per(a.proteinaG), c: per(a.carboG), f: per(a.gorduraG) }, source: 'ia' },
  }
}

export function dietFromFormat(
  d: PumpDieta,
  taco: TacoFood[] | null,
  customs: DietItem[],
): { plan: DietPlan; items: ItemReport[]; offline: boolean } {
  const items: ItemReport[] = []
  const menus = d.cardapios.map((cd, menuIdx): Menu => ({
    id: crypto.randomUUID(),
    name: cd.nome,
    ...(cd.metaKcal !== undefined && { goalKcal: cd.metaKcal }),
    ...(cd.macros && { goalMacros: { p: cd.macros.proteinaG, c: cd.macros.carboG, f: cd.macros.gorduraG } }),
    meals: cd.refeicoes.map((r, mealIdx) => ({
      id: crypto.randomUUID(),
      name: r.nome,
      time: r.horario,
      options: r.opcoes.map((op, optionIdx) => ({
        id: crypto.randomUUID(),
        ...(op.nome && { name: op.nome }),
        items: op.alimentos.map((a, itemIdx) => {
          const { item, match } = itemFromFormat(a, taco, customs)
          items.push({ menuIdx, mealIdx, optionIdx, itemIdx, match, aiName: a.nome })
          return item
        }),
      })),
    })),
  }))
  return { plan: { menus }, items, offline: taco === null }
}

const r1 = (v: number) => Math.round(v * 10) / 10

const exportFood = (i: DietItem) => {
  const q = i.grams / 100
  // "sem valores" sai sem números pra voltar como "sem valores", não como estimativa de 0 kcal
  const noValues = i.source === 'ia' && i.per100.kcal === 0
  return {
    nome: i.name,
    gramas: i.grams,
    ...(i.portion && { porcao: i.portion }),
    ...(!noValues && {
      kcal: Math.round(i.per100.kcal * q),
      proteinaG: r1(i.per100.p * q),
      carboG: r1(i.per100.c * q),
      gorduraG: r1(i.per100.f * q),
    }),
  }
}

export function exportDietFormat(plan: DietPlan): string {
  return JSON.stringify({
    formato: 'pump-plano',
    versao: 1,
    dieta: {
      cardapios: plan.menus.map((menu) => ({
        nome: menu.name,
        ...(menu.goalKcal !== undefined && { metaKcal: menu.goalKcal }),
        ...(menu.goalMacros && { macros: { proteinaG: menu.goalMacros.p, carboG: menu.goalMacros.c, gorduraG: menu.goalMacros.f } }),
        refeicoes: menu.meals.map((m) => ({
          nome: m.name,
          horario: m.time,
          opcoes: m.options.map((o) => ({ ...(o.name && { nome: o.name }), alimentos: o.items.map(exportFood) })),
        })),
      })),
    },
  }, null, 2)
}
