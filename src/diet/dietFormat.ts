import type { DietItem, DietPlan, Menu, TacoFood } from './types'
import { FormatError, readEnvelope, str, writeEnvelope } from '@/format/envelope'
import { isObj } from '@/schema'
import { GOAL_KCAL, GRAMS, HHMM, MACRO_G, MAX_ITEMS, MAX_KCAL_PER_100G, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'
import { matchFood } from './match'
import { asFood, hasValues } from './food'
import { round1 } from '@/lib/number'

export interface PumpAlimento { nome: string; gramas: number; porcao?: string; kcal?: number; proteinaG?: number; carboG?: number; gorduraG?: number }
interface PumpOpcao { nome?: string; alimentos: PumpAlimento[] }
interface PumpRefeicao { nome: string; horario: string; opcoes: PumpOpcao[] }
interface PumpMacros { proteinaG: number; carboG: number; gorduraG: number }
interface PumpCardapio { nome: string; metaKcal?: number; macros?: PumpMacros; refeicoes: PumpRefeicao[] }
export interface PumpDieta { cardapios: PumpCardapio[] }

type Obj = Record<string, unknown>
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const VALUES = ['kcal', 'proteinaG', 'carboG', 'gorduraG'] as const

function parseFoods(v: unknown, tag: string, problems: string[]): PumpAlimento[] {
  const foods = Array.isArray(v) ? v : []
  if (foods.length === 0) problems.push(`${tag}: sem alimentos`)
  if (foods.length > MAX_ITEMS) problems.push(`${tag}: mais de ${MAX_ITEMS} alimentos`)
  return foods.map((a: unknown, i): PumpAlimento => {
    const x = isObj(a) ? a : {}
    const at = `${tag}, alimento ${i + 1}`
    const nome = str(x.nome)
    if (!nome) problems.push(`${at}: falta o nome`)
    const gramas = x.gramas as number
    if (!num(gramas, ...GRAMS)) problems.push(`${at}: gramas inválidas`)
    const porcao = str(x.porcao)
    const out: PumpAlimento = { nome, gramas, ...(porcao && { porcao }) }
    // valor fora do formato é só descartado: o item continua e fica "sem valores" se faltar a kcal
    for (const k of VALUES) if (num(x[k], 0, Infinity)) out[k] = x[k] as number
    if (out.kcal !== undefined && (out.kcal * 100) / gramas > MAX_KCAL_PER_100G) delete out.kcal
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
  if (o.opcoes.length > MAX_OPTIONS) problems.push(`${tag}: mais de ${MAX_OPTIONS} opções`)
  const opcoes = o.opcoes.map((op: unknown, i): PumpOpcao => {
    const x = isObj(op) ? op : {}
    const opNome = str(x.nome)
    return { ...(opNome && { nome: opNome }), alimentos: parseFoods(x.alimentos, `${tag}, opção ${i + 1}`, problems) }
  })
  return { nome, horario, opcoes }
}

/** `tag` ("Cardápio 2") só quando o arquivo usa "cardapios"; sem ele, as mensagens são as do formato de um cardápio só */
function parseMenu(d: Obj, tag: string | undefined, problems: string[]): PumpCardapio {
  const pre = tag === undefined ? '' : `${tag}: `
  const nome = tag === undefined ? 'Cardápio' : str(d.nome)
  if (!nome) problems.push(`${pre}falta o nome`)
  const list = Array.isArray(d.refeicoes) ? d.refeicoes : []
  if (list.length === 0) problems.push(tag === undefined ? 'Cardápio sem refeições' : `${pre}sem refeições`)
  if (list.length > MAX_MEALS) problems.push(tag === undefined ? `Cardápio com mais de ${MAX_MEALS} refeições` : `${pre}mais de ${MAX_MEALS} refeições`)
  const metaKcal = d.metaKcal === null ? undefined : d.metaKcal
  if (metaKcal !== undefined && !(Number.isInteger(metaKcal) && num(metaKcal, ...GOAL_KCAL))) problems.push(`${pre}metaKcal fora da faixa (${GOAL_KCAL[0]} a ${GOAL_KCAL[1]})`)
  const m = isObj(d.macros) ? d.macros : undefined
  if (d.macros !== undefined && d.macros !== null && !(m && num(m.proteinaG, ...MACRO_G) && num(m.carboG, ...MACRO_G) && num(m.gorduraG, ...MACRO_G))) problems.push(`${pre}macros fora da faixa (${MACRO_G[0]} a ${MACRO_G[1]})`)
  const refeicoes = list.map((r: unknown, n) => parseMeal(r, tag === undefined ? `Refeição ${n + 1}` : `${tag}, refeição ${n + 1}`, problems))
  return {
    nome,
    ...(metaKcal !== undefined && { metaKcal: metaKcal as number }),
    ...(m && { macros: { proteinaG: m.proteinaG as number, carboG: m.carboG as number, gorduraG: m.gorduraG as number } }),
    refeicoes,
  }
}

export function parseDietFormat(text: string): PumpDieta {
  // o cabeçalho não é conferido aqui: a dieta sempre aceitou arquivo sem "formato"/"versao"
  const raw = readEnvelope(text, 'Não encontrei um cardápio em JSON no texto')
  if (!isObj(raw.dieta)) throw new FormatError(['Este arquivo não tem dieta.'])
  const d = raw.dieta
  const problems: string[] = []
  let cardapios: PumpCardapio[]
  if (Array.isArray(d.cardapios)) {
    if (d.cardapios.length === 0) problems.push('Dieta sem cardápios')
    if (d.cardapios.length > MAX_MENUS) problems.push(`Mais de ${MAX_MENUS} cardápios`)
    cardapios = d.cardapios.map((x: unknown, i) => parseMenu(isObj(x) ? x : {}, `Cardápio ${i + 1}`, problems))
  } else cardapios = [parseMenu(d, undefined, problems)]
  if (problems.length) throw new FormatError(problems)
  return { cardapios }
}

type Match = 'custom' | 'exact' | 'words' | 'ia' | 'none'
/** como cada item do import casou (pelo id do item) e o nome que a IA escreveu */
export type ItemReport = { match: Match; aiName: string }

function itemFromFormat(a: PumpAlimento, taco: TacoFood[] | null, customs: DietItem[]): { item: DietItem; match: Match } {
  const base = { id: crypto.randomUUID(), grams: a.gramas, ...(a.porcao && { portion: a.porcao }) }
  const found = matchFood(a.nome, a.gramas, a.kcal, taco ?? [], customs)
  if (found?.kind === 'custom') {
    return { match: 'custom', item: { ...asFood(found.item), ...base } }
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

export function exportDietFormat(plan: DietPlan): string {
  return writeEnvelope({
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
  })
}
