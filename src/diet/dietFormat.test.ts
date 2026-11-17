import type { DietItem, DietPlan, TacoFood } from '../types'
import type { PlanFormatError } from '../workout/planFormat'
import { dietFromFormat, exportDietFormat, parseDietFormat, type PumpDieta } from './dietFormat'

const T: TacoFood[] = [
  { id: 1, name: 'Arroz, integral, cozido', kcal: 124, p: 2.6, c: 25.8, f: 1 },
  { id: 2, name: 'Arroz, integral, cru', kcal: 360, p: 7.3, c: 77.5, f: 1.9 },
  { id: 53, name: 'Pão, trigo, francês', kcal: 300, p: 8, c: 58.6, f: 3.1 },
]
const file = (dieta: unknown) => JSON.stringify({ formato: 'pump-plano', versao: 1, dieta })
const problems = (text: string) => {
  try { parseDietFormat(text) } catch (e) { return (e as PlanFormatError).problems }
  throw new Error('não lançou')
}
const meal = (alimentos: unknown[], extra = {}) => ({ nome: 'Café', horario: '07:00', alimentos, ...extra })
const pao = { nome: 'Pão, trigo, francês', gramas: 50, porcao: '1 un', kcal: 150, proteinaG: 4, carboG: 29, gorduraG: 1.5 }

test('parseDietFormat aceita JSON dentro de bloco de código', () => {
  const d = parseDietFormat('Pronto:\n```json\n' + file({ metaKcal: 1950, macros: { proteinaG: 150, carboG: 190, gorduraG: 60 }, refeicoes: [meal([pao])] }) + '\n```\nBom apetite!')
  expect(d).toEqual({ metaKcal: 1950, macros: { proteinaG: 150, carboG: 190, gorduraG: 60 }, refeicoes: [{ nome: 'Café', horario: '07:00', alimentos: [pao] }] })
})

test('cada regra de validação tem sua mensagem', () => {
  expect(() => parseDietFormat('oi, tudo bem?')).toThrow('Não encontrei um cardápio em JSON no texto')
  expect(() => parseDietFormat('{"formato":"pump-plano","versao":1,"treinos":[]}')).toThrow('Este arquivo não tem dieta.')
  expect(problems(file({ refeicoes: [] }))).toEqual(['Cardápio sem refeições'])
  expect(problems(file({ refeicoes: Array.from({ length: 11 }, () => meal([pao])) }))).toEqual(['Cardápio com mais de 10 refeições'])
  expect(problems(file({ refeicoes: [meal(Array.from({ length: 31 }, () => pao))] }))).toEqual(['Refeição 1: mais de 30 alimentos'])
  expect(problems(file({ metaKcal: 300, macros: { proteinaG: 700, carboG: 100, gorduraG: 50 }, refeicoes: [
    meal([{ nome: 'Pão', gramas: 0 }, { nome: 'Arroz', gramas: 5000 }, { nome: ' ', gramas: 10 }], { horario: '7h' }),
    meal([], { nome: '' }),
  ] }))).toEqual([
    'metaKcal fora da faixa (800 a 6000)',
    'macros fora da faixa (0 a 600)',
    'Refeição 1: horário inválido (use HH:MM)',
    'Refeição 1, alimento 1: gramas inválidas',
    'Refeição 1, alimento 2: gramas inválidas',
    'Refeição 1, alimento 3: falta o nome',
    'Refeição 2: falta o nome',
    'Refeição 2: sem alimentos',
  ])
})

test('horário H:MM vira 0H:MM; outros formatos continuam recusados', () => {
  expect(parseDietFormat(file({ refeicoes: [meal([pao], { horario: '7:00' })] })).refeicoes[0].horario).toBe('07:00')
  for (const horario of ['7h', '7:0', '24:00', '007:00', '12:60'])
    expect(problems(file({ refeicoes: [meal([pao], { horario })] }))).toEqual(['Refeição 1: horário inválido (use HH:MM)'])
})

test('item "sem valores" exportado volta como "none", não como estimativa de 0 kcal', () => {
  const plan: DietPlan = { meals: [{ id: 'm1', name: 'Lanche', time: '16:00', items: [{ id: 'i1', name: 'Coisa estranha', grams: 50, per100: { kcal: 0, p: 0, c: 0, f: 0 }, source: 'ia' }] }] }
  const text = exportDietFormat(plan)
  expect(JSON.parse(text).dieta.refeicoes[0].alimentos).toEqual([{ nome: 'Coisa estranha', gramas: 50 }])
  expect(dietFromFormat(parseDietFormat(text), T, []).items[0].match).toBe('none')
})

test('kcal por 100 g acima de 900 é tratada como ausente', () => {
  const d = parseDietFormat(file({ refeicoes: [meal([{ nome: 'Azeite', gramas: 10, kcal: 95, gorduraG: 10 }, { nome: 'Manteiga', gramas: 10, kcal: 88 }, { nome: 'X', gramas: 10, kcal: -1, proteinaG: 'muito' }])] }))
  expect(d.refeicoes[0].alimentos).toEqual([{ nome: 'Azeite', gramas: 10, gorduraG: 10 }, { nome: 'Manteiga', gramas: 10, kcal: 88 }, { nome: 'X', gramas: 10 }])
})

test('dietFromFormat: casados guardam o nome da TACO; sem casamento vira ia com per100 da IA', () => {
  const d: PumpDieta = { metaKcal: 1950, macros: { proteinaG: 150, carboG: 190, gorduraG: 60 }, refeicoes: [
    { nome: 'Almoço', horario: '12:00', alimentos: [{ nome: 'Arroz integral', gramas: 100, porcao: '4 colheres', kcal: 130 }, { nome: 'Whey protein', gramas: 30, kcal: 120, proteinaG: 24, carboG: 3 }] },
  ] }
  const r = dietFromFormat(d, T, [])
  expect(r.offline).toBe(false)
  expect(r.plan.goalKcal).toBe(1950)
  expect(r.plan.goalMacros).toEqual({ p: 150, c: 190, f: 60 })
  const m = r.plan.meals[0]
  expect(m).toMatchObject({ name: 'Almoço', time: '12:00' })
  expect(m.items[0]).toEqual({ id: expect.any(String), name: 'Arroz, integral, cozido', grams: 100, portion: '4 colheres', per100: { kcal: 124, p: 2.6, c: 25.8, f: 1 }, source: 'taco', tacoId: 1 })
  expect(m.items[1]).toEqual({ id: expect.any(String), name: 'Whey protein', grams: 30, per100: { kcal: 400, p: 80, c: 10, f: 0 }, source: 'ia' })
  expect(new Set([m.id, m.items[0].id, m.items[1].id]).size).toBe(3)
  expect(r.items).toEqual([
    { mealIdx: 0, itemIdx: 0, match: 'words', aiName: 'Arroz integral' },
    { mealIdx: 0, itemIdx: 1, match: 'ia', aiName: 'Whey protein' },
  ])
})

test('sem kcal da IA e sem casamento: entra com 0 e match "none"', () => {
  const r = dietFromFormat({ refeicoes: [{ nome: 'Lanche', horario: '16:00', alimentos: [{ nome: 'Coisa estranha', gramas: 50, proteinaG: 5 }] }] }, T, [])
  expect(r.plan.meals[0].items[0]).toMatchObject({ name: 'Coisa estranha', per100: { kcal: 0, p: 0, c: 0, f: 0 }, source: 'ia' })
  expect(r.items[0].match).toBe('none')
  expect(r.plan.goalKcal).toBeUndefined()
  expect(r.plan.goalMacros).toBeUndefined()
})

test('taco null: tudo ia e offline true', () => {
  const r = dietFromFormat({ refeicoes: [{ nome: 'Café', horario: '07:00', alimentos: [{ nome: 'Pão, trigo, francês', gramas: 50, kcal: 150 }] }] }, null, [])
  expect(r.offline).toBe(true)
  expect(r.items.map((i) => i.match)).toEqual(['ia'])
  expect(r.plan.meals[0].items[0]).toMatchObject({ source: 'ia', per100: { kcal: 300 } })
})

test('exportar e importar de novo mantém alimento criado como custom', () => {
  const bolo: DietItem = { id: 'c1', name: 'Bolo da vó', grams: 100, per100: { kcal: 350, p: 5, c: 50, f: 14.04 }, source: 'custom' }
  const plan: DietPlan = { goalKcal: 2000, goalMacros: { p: 140, c: 220, f: 60 }, meals: [{ id: 'm1', name: 'Café', time: '07:00', items: [
    { ...bolo, id: 'i1', grams: 80, portion: '1 fatia' },
    { id: 'i2', name: 'Pão, trigo, francês', grams: 50, per100: { kcal: 300, p: 8, c: 58.6, f: 3.1 }, source: 'taco', tacoId: 53 },
  ] }] }
  const text = exportDietFormat(plan)
  expect(JSON.parse(text)).toEqual({ formato: 'pump-plano', versao: 1, dieta: { metaKcal: 2000, macros: { proteinaG: 140, carboG: 220, gorduraG: 60 }, refeicoes: [{ nome: 'Café', horario: '07:00', alimentos: [
    { nome: 'Bolo da vó', gramas: 80, porcao: '1 fatia', kcal: 280, proteinaG: 4, carboG: 40, gorduraG: 11.2 },
    { nome: 'Pão, trigo, francês', gramas: 50, kcal: 150, proteinaG: 4, carboG: 29.3, gorduraG: 1.6 },
  ] }] } })
  expect(text).toContain('\n  "versao"')
  const r = dietFromFormat(parseDietFormat(text), T, [bolo])
  expect(r.items.map((i) => i.match)).toEqual(['custom', 'exact'])
  expect(r.plan.meals[0].items[0]).toEqual({ ...bolo, id: expect.any(String), grams: 80, portion: '1 fatia' })
  expect(r.plan.meals[0].items[0].id).not.toBe('c1')
  expect(r.plan.meals[0].items[1]).toMatchObject({ name: 'Pão, trigo, francês', source: 'taco', tacoId: 53 })
})
