import type { DietItem, DietPlan, Menu, TacoFood } from './types'
import { FormatError, readEnvelope, str, writeEnvelope } from '@/format/envelope'
import { isObj } from '@/lib/utils'
import { round1 } from '@/lib/number'
import { GOAL_KCAL, GRAMS, HHMM, MACRO_G, MAX_ITEMS, MAX_KCAL_PER_100G, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'
import { matchFood } from './match'
import { normalizeMealTime } from './plan'
import { asFood, fromTaco, hasValues } from './food'

export const DIET_NOT_FOUND = 'Não encontrei um cardápio em JSON no texto'

export interface PumpAlimento { nome: string; gramas: number; porcao?: string; kcal?: number; proteinaG?: number; carboG?: number; gorduraG?: number }
interface PumpOpcao { nome?: string; alimentos: PumpAlimento[] }
interface PumpRefeicao { nome: string; horario: string; opcoes: PumpOpcao[] }
interface PumpMacros { proteinaG: number; carboG: number; gorduraG: number }
interface PumpCardapio { nome: string; metaKcal?: number; macros?: PumpMacros; refeicoes: PumpRefeicao[] }
export interface PumpDieta { cardapios: PumpCardapio[] }

type Obj = Record<string, unknown>
type DraftRule = 'menuName' | 'emptyMenu' | 'mealFields' | 'emptyOption' | 'goal' | 'macros'
type AddProblem = (text: string, rule?: DraftRule) => void
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const VALUES = ['kcal', 'proteinaG', 'carboG', 'gorduraG'] as const

function parseFoods(v: unknown, tag: string, problem: AddProblem): PumpAlimento[] {
  const foods = Array.isArray(v) ? v : []
  if (foods.length === 0) problem(`${tag}: sem alimentos`, 'emptyOption')
  if (foods.length > MAX_ITEMS) problem(`${tag}: mais de ${MAX_ITEMS} alimentos`)
  return foods.map((a: unknown, i): PumpAlimento => {
    const x = isObj(a) ? a : {}
    const at = `${tag}, alimento ${i + 1}`
    const nome = str(x.nome)
    if (!nome) problem(`${at}: falta o nome`)
    const gramas = x.gramas as number
    if (!num(gramas, ...GRAMS)) problem(`${at}: gramas inválidas`)
    const porcao = str(x.porcao)
    const out: PumpAlimento = { nome, gramas, ...(porcao && { porcao }) }
    for (const k of VALUES) if (num(x[k], 0, Infinity)) out[k] = x[k] as number
    if (out.kcal !== undefined && (out.kcal * 100) / gramas > MAX_KCAL_PER_100G) delete out.kcal
    return out
  })
}

function parseMeal(r: unknown, tag: string, problem: AddProblem): PumpRefeicao {
  const o = isObj(r) ? r : {}
  const nome = str(o.nome)
  if (!nome) problem(`${tag}: falta o nome`, 'mealFields')
  const horario = normalizeMealTime(str(o.horario))
  if (!HHMM.test(horario)) problem(`${tag}: horário inválido (use HH:MM)`, 'mealFields')
  if (!Array.isArray(o.opcoes)) return { nome, horario, opcoes: [{ alimentos: parseFoods(o.alimentos, tag, problem) }] }
  if (o.opcoes.length === 0) problem(`${tag}: sem opções`)
  if (o.opcoes.length > MAX_OPTIONS) problem(`${tag}: mais de ${MAX_OPTIONS} opções`)
  const opcoes = o.opcoes.map((op: unknown, i): PumpOpcao => {
    const x = isObj(op) ? op : {}
    const opNome = str(x.nome)
    return { ...(opNome && { nome: opNome }), alimentos: parseFoods(x.alimentos, `${tag}, opção ${i + 1}`, problem) }
  })
  return { nome, horario, opcoes }
}

function parseMenu(d: Obj | PumpCardapio, tag: string | undefined, problem: AddProblem): PumpCardapio {
  const pre = tag === undefined ? '' : `${tag}: `
  const nome = tag === undefined ? 'Cardápio' : str(d.nome)
  if (!nome) problem(`${pre}falta o nome`, 'menuName')
  const list = Array.isArray(d.refeicoes) ? d.refeicoes : []
  if (list.length === 0) problem(tag === undefined ? 'Cardápio sem refeições' : `${pre}sem refeições`, 'emptyMenu')
  if (list.length > MAX_MEALS) problem(tag === undefined ? `Cardápio com mais de ${MAX_MEALS} refeições` : `${pre}mais de ${MAX_MEALS} refeições`)
  const metaKcal = d.metaKcal === null ? undefined : d.metaKcal
  if (metaKcal !== undefined && !(Number.isInteger(metaKcal) && num(metaKcal, ...GOAL_KCAL))) problem(`${pre}metaKcal fora da faixa (${GOAL_KCAL[0]} a ${GOAL_KCAL[1]})`, 'goal')
  const m = isObj(d.macros) ? d.macros : undefined
  if (d.macros !== undefined && d.macros !== null && !(m && num(m.proteinaG, ...MACRO_G) && num(m.carboG, ...MACRO_G) && num(m.gorduraG, ...MACRO_G))) problem(`${pre}macros fora da faixa (${MACRO_G[0]} a ${MACRO_G[1]})`, 'macros')
  const refeicoes = list.map((r: unknown, n) => parseMeal(r, tag === undefined ? `Refeição ${n + 1}` : `${tag}, refeição ${n + 1}`, problem))
  return {
    nome,
    ...(metaKcal !== undefined && { metaKcal: metaKcal as number }),
    ...(m && { macros: { proteinaG: m.proteinaG as number, carboG: m.carboG as number, gorduraG: m.gorduraG as number } }),
    refeicoes,
  }
}

export function parseDietFormat(text: string): PumpDieta {
  // o cabeçalho não é conferido aqui: a dieta sempre aceitou arquivo sem "formato"/"versao"
  const raw = readEnvelope(text, DIET_NOT_FOUND)
  if (!isObj(raw.dieta)) throw new FormatError(['Este arquivo não tem dieta.'])
  const d = raw.dieta
  const problems: string[] = []
  const problem = (text: string) => { problems.push(text) }
  let cardapios: PumpCardapio[]
  if (Array.isArray(d.cardapios)) {
    if (d.cardapios.length === 0) problems.push('Dieta sem cardápios')
    if (d.cardapios.length > MAX_MENUS) problems.push(`Mais de ${MAX_MENUS} cardápios`)
    cardapios = d.cardapios.map((x: unknown, i) => parseMenu(isObj(x) ? x : {}, `Cardápio ${i + 1}`, problem))
  } else cardapios = [parseMenu(d, undefined, problem)]
  if (problems.length) throw new FormatError(problems)
  return { cardapios }
}

type Match = 'custom' | 'exact' | 'words' | 'ia' | 'none'
export type ItemReport = { match: Match; aiName: string }

function itemFromFormat(a: PumpAlimento, taco: TacoFood[] | null, customs: DietItem[]): { item: DietItem; match: Match } {
  const base = { id: crypto.randomUUID(), grams: a.gramas, ...(a.porcao && { portion: a.porcao }) }
  const found = matchFood(a.nome, a.gramas, a.kcal, taco ?? [], customs)
  if (found?.kind === 'custom') {
    return { match: 'custom', item: { ...asFood(found.item), ...base } }
  }
  if (found) {
    return { match: found.kind, item: { ...base, ...fromTaco(found.food) } }
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
): { plan: DietPlan; reports: Record<string, ItemReport>; offline: boolean } {
  const reports: Record<string, ItemReport> = {}
  const menus = d.cardapios.map((cd): Menu => ({
    id: crypto.randomUUID(),
    name: cd.nome,
    ...(cd.metaKcal !== undefined && { goalKcal: cd.metaKcal }),
    ...(cd.macros && { goalMacros: { p: cd.macros.proteinaG, c: cd.macros.carboG, f: cd.macros.gorduraG } }),
    meals: cd.refeicoes.map((r) => ({
      id: crypto.randomUUID(),
      name: r.nome,
      time: r.horario,
      options: r.opcoes.map((op) => ({
        id: crypto.randomUUID(),
        ...(op.nome && { name: op.nome }),
        items: op.alimentos.map((a) => {
          const { item, match } = itemFromFormat(a, taco, customs)
          reports[item.id] = { match, aiName: a.nome }
          return item
        }),
      })),
    })),
  }))
  return { plan: { menus }, reports, offline: taco === null }
}

const exportFood = (i: DietItem) => {
  const q = i.grams / 100
  return {
    nome: i.name,
    gramas: i.grams,
    ...(i.portion && { porcao: i.portion }),
    // "sem valores" sai sem números pra voltar como "sem valores", não como estimativa de 0 kcal
    ...(hasValues(i) && {
      kcal: Math.round(i.per100.kcal * q),
      proteinaG: round1(i.per100.p * q),
      carboG: round1(i.per100.c * q),
      gorduraG: round1(i.per100.f * q),
    }),
  }
}

const encodeMenu = (menu: Menu): PumpCardapio => ({
  nome: menu.name,
  ...(menu.goalKcal !== undefined && { metaKcal: menu.goalKcal }),
  ...(menu.goalMacros && { macros: { proteinaG: menu.goalMacros.p, carboG: menu.goalMacros.c, gorduraG: menu.goalMacros.f } }),
  refeicoes: menu.meals.map((m) => ({
    nome: m.name,
    horario: m.time,
    opcoes: m.options.map((o) => ({ ...(o.name && { nome: o.name }), alimentos: o.items.map(exportFood) })),
  })),
})

export function exportDietFormat(plan: DietPlan): string {
  return writeEnvelope({ dieta: { cardapios: plan.menus.map(encodeMenu) } })
}

export function planProblem(plan: DietPlan): { menuId: string; text: string } | undefined {
  if (plan.menus.length > MAX_MENUS) return { menuId: plan.menus[0].id, text: `Use até ${MAX_MENUS} cardápios` }
  for (const menu of plan.menus) {
    const n = menu.name.trim()
    const messages: Record<DraftRule, string> = {
      menuName: 'Dê um nome a cada cardápio',
      emptyMenu: `${n}: adicione uma refeição`,
      mealFields: `${n}: preencha nome e horário (HH:MM) de cada refeição`,
      emptyOption: `${n}: cada opção precisa de ao menos 1 alimento`,
      goal: num(menu.goalKcal, ...GOAL_KCAL)
        ? `${n}: informe a meta em kcal inteiras`
        : `${n}: meta fora da faixa (${GOAL_KCAL[0]} a ${GOAL_KCAL[1]} kcal)`,
      macros: `${n}: macros fora da faixa (${MACRO_G[0]} a ${MACRO_G[1]} g)`,
    }
    const rules = new Set<DraftRule>()
    let first = ''
    parseMenu(encodeMenu(menu), n, (text, rule) => {
      if (rule) rules.add(rule)
      if (!first) first = text
    })
    if (first) {
      const rule = (Object.keys(messages) as DraftRule[]).find((r) => rules.has(r))
      return { menuId: menu.id, text: rule ? messages[rule] : first }
    }
  }
}
