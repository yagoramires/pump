import type { DietItem, DietPlan, TacoFood } from '../types'
import type { PlanFormatError } from '../workout/planFormat'
import { dietFromFormat, exportDietFormat, parseDietFormat, type PumpAlimento, type PumpDieta } from './dietFormat'

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
/** dieta já lida, com um cardápio e uma opção por refeição */
const one = (refeicoes: { nome: string; horario: string; alimentos: PumpAlimento[] }[], extra = {}): PumpDieta =>
  ({ cardapios: [{ nome: 'Cardápio', ...extra, refeicoes: refeicoes.map(({ alimentos, ...r }) => ({ ...r, opcoes: [{ alimentos }] })) }] })

test('parseDietFormat aceita JSON dentro de bloco de código', () => {
  const d = parseDietFormat('Pronto:\n```json\n' + file({ metaKcal: 1950, macros: { proteinaG: 150, carboG: 190, gorduraG: 60 }, refeicoes: [meal([pao])] }) + '\n```\nBom apetite!')
  expect(d).toEqual({ cardapios: [{ nome: 'Cardápio', metaKcal: 1950, macros: { proteinaG: 150, carboG: 190, gorduraG: 60 }, refeicoes: [{ nome: 'Café', horario: '07:00', opcoes: [{ alimentos: [pao] }] }] }] })
})

test('formato aceita cardapios/opcoes, refeicoes direto e alimentos direto', () => {
  const iogurte = { nome: 'Iogurte, natural', gramas: 170 }
  const d = parseDietFormat(file({ cardapios: [
    { nome: ' Dia de treino ', metaKcal: 2100, macros: { proteinaG: 160, carboG: 220, gorduraG: 60 }, refeicoes: [
      { nome: 'Café da manhã', horario: '7:00', opcoes: [{ nome: ' Ovos com pão ', alimentos: [pao] }, { nome: ' ', alimentos: [iogurte] }] },
      meal([iogurte], { nome: 'Lanche', horario: '16:00' }),
    ] },
    { nome: 'Descanso', refeicoes: [meal([pao])] },
  ] }))
  expect(d).toEqual({ cardapios: [
    { nome: 'Dia de treino', metaKcal: 2100, macros: { proteinaG: 160, carboG: 220, gorduraG: 60 }, refeicoes: [
      { nome: 'Café da manhã', horario: '07:00', opcoes: [{ nome: 'Ovos com pão', alimentos: [pao] }, { alimentos: [iogurte] }] },
      { nome: 'Lanche', horario: '16:00', opcoes: [{ alimentos: [iogurte] }] },
    ] },
    { nome: 'Descanso', refeicoes: [{ nome: 'Café', horario: '07:00', opcoes: [{ alimentos: [pao] }] }] },
  ] })
  // refeicoes direto vira um cardápio "Cardápio"; opcoes também vale nesse formato
  expect(parseDietFormat(file({ refeicoes: [meal([], { opcoes: [{ alimentos: [pao] }, { alimentos: [iogurte] }] })] })).cardapios)
    .toEqual([{ nome: 'Cardápio', refeicoes: [{ nome: 'Café', horario: '07:00', opcoes: [{ alimentos: [pao] }, { alimentos: [iogurte] }] }] }])
})

test('mensagens de cardápio/opção', () => {
  const opt = (n: number) => Array.from({ length: n }, () => ({ alimentos: [pao] }))
  expect(problems(file({ cardapios: [] }))).toEqual(['Dieta sem cardápios'])
  expect(problems(file({ cardapios: Array.from({ length: 6 }, () => ({ nome: 'X', refeicoes: [meal([pao])] })) }))).toEqual(['Mais de 5 cardápios'])
  expect(problems(file({ cardapios: [
    { nome: '', metaKcal: 100, refeicoes: [] },
    { nome: 'B', refeicoes: [
      meal([], { opcoes: opt(5) }),
      meal([], { opcoes: [] }),
      meal([], { horario: '7h', opcoes: [{ nome: 'A', alimentos: [] }, { alimentos: [{ nome: 'Pão', gramas: 0 }] }, { alimentos: Array.from({ length: 31 }, () => pao) }] }),
      meal([{ nome: '', gramas: 10 }], { nome: '' }),
    ] },
  ] }))).toEqual([
    'Cardápio 1: falta o nome',
    'Cardápio 1: sem refeições',
    'Cardápio 1: metaKcal fora da faixa (800 a 6000)',
    'Cardápio 2, refeição 1: mais de 4 opções',
    'Cardápio 2, refeição 2: sem opções',
    'Cardápio 2, refeição 3: horário inválido (use HH:MM)',
    'Cardápio 2, refeição 3, opção 1: sem alimentos',
    'Cardápio 2, refeição 3, opção 2, alimento 1: gramas inválidas',
    'Cardápio 2, refeição 3, opção 3: mais de 30 alimentos',
    'Cardápio 2, refeição 4: falta o nome',
    'Cardápio 2, refeição 4, alimento 1: falta o nome',
  ])
  // com refeicoes direto, as mensagens continuam sem "Cardápio N"
  expect(problems(file({ refeicoes: [meal([], { opcoes: [{ alimentos: [] }] })] }))).toEqual(['Refeição 1, opção 1: sem alimentos'])
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
  expect(parseDietFormat(file({ refeicoes: [meal([pao], { horario: '7:00' })] })).cardapios[0].refeicoes[0].horario).toBe('07:00')
  for (const horario of ['7h', '7:0', '24:00', '007:00', '12:60'])
    expect(problems(file({ refeicoes: [meal([pao], { horario })] }))).toEqual(['Refeição 1: horário inválido (use HH:MM)'])
})

test('item "sem valores" exportado volta como "none", não como estimativa de 0 kcal', () => {
  const plan: DietPlan = { menus: [{ id: 'c', name: 'Cardápio', meals: [{ id: 'm1', name: 'Lanche', time: '16:00', options: [{ id: 'o1', items: [{ id: 'i1', name: 'Coisa estranha', grams: 50, per100: { kcal: 0, p: 0, c: 0, f: 0 }, source: 'ia' }] }] }] }] }
  const text = exportDietFormat(plan)
  expect(JSON.parse(text).dieta.cardapios[0].refeicoes[0].opcoes[0].alimentos).toEqual([{ nome: 'Coisa estranha', gramas: 50 }])
  expect(dietFromFormat(parseDietFormat(text), T, []).items[0].match).toBe('none')
})

test('kcal por 100 g acima de 900 é tratada como ausente', () => {
  const d = parseDietFormat(file({ refeicoes: [meal([{ nome: 'Azeite', gramas: 10, kcal: 95, gorduraG: 10 }, { nome: 'Manteiga', gramas: 10, kcal: 88 }, { nome: 'X', gramas: 10, kcal: -1, proteinaG: 'muito' }])] }))
  expect(d.cardapios[0].refeicoes[0].opcoes[0].alimentos).toEqual([{ nome: 'Azeite', gramas: 10, gorduraG: 10 }, { nome: 'Manteiga', gramas: 10, kcal: 88 }, { nome: 'X', gramas: 10 }])
})

test('dietFromFormat: casados guardam o nome da TACO; sem casamento vira ia com per100 da IA', () => {
  const d = one([
    { nome: 'Almoço', horario: '12:00', alimentos: [{ nome: 'Arroz integral', gramas: 100, porcao: '4 colheres', kcal: 130 }, { nome: 'Whey protein', gramas: 30, kcal: 120, proteinaG: 24, carboG: 3 }] },
  ], { metaKcal: 1950, macros: { proteinaG: 150, carboG: 190, gorduraG: 60 } })
  const r = dietFromFormat(d, T, [])
  expect(r.offline).toBe(false)
  expect(r.plan.menus).toHaveLength(1)
  const menu = r.plan.menus[0]
  expect(menu).toMatchObject({ name: 'Cardápio', goalKcal: 1950, goalMacros: { p: 150, c: 190, f: 60 } })
  const m = menu.meals[0]
  expect(m).toMatchObject({ name: 'Almoço', time: '12:00' })
  const items = m.options[0].items
  expect(m.options[0]).not.toHaveProperty('name')
  expect(items[0]).toEqual({ id: expect.any(String), name: 'Arroz, integral, cozido', grams: 100, portion: '4 colheres', per100: { kcal: 124, p: 2.6, c: 25.8, f: 1 }, source: 'taco', tacoId: 1 })
  expect(items[1]).toEqual({ id: expect.any(String), name: 'Whey protein', grams: 30, per100: { kcal: 400, p: 80, c: 10, f: 0 }, source: 'ia' })
  expect(new Set([menu.id, m.id, m.options[0].id, items[0].id, items[1].id]).size).toBe(5)
  expect(r.items).toEqual([
    { menuIdx: 0, mealIdx: 0, optionIdx: 0, itemIdx: 0, match: 'words', aiName: 'Arroz integral' },
    { menuIdx: 0, mealIdx: 0, optionIdx: 0, itemIdx: 1, match: 'ia', aiName: 'Whey protein' },
  ])
})

test('dietFromFormat: vários cardápios e opções, com índices no relatório', () => {
  const r = dietFromFormat({ cardapios: [
    { nome: 'Treino', refeicoes: [{ nome: 'Café', horario: '07:00', opcoes: [{ nome: 'Pão', alimentos: [{ nome: 'Pão, trigo, francês', gramas: 50 }] }, { alimentos: [{ nome: 'Coisa', gramas: 10, kcal: 20 }] }] }] },
    { nome: 'Descanso', refeicoes: [{ nome: 'Café', horario: '08:00', opcoes: [{ alimentos: [{ nome: 'Arroz, integral, cru', gramas: 50 }] }] }] },
  ] }, T, [])
  expect(r.plan.menus.map((m) => m.name)).toEqual(['Treino', 'Descanso'])
  expect(r.plan.menus[0].meals[0].options.map((o) => o.name)).toEqual(['Pão', undefined])
  expect(r.items.map(({ menuIdx, mealIdx, optionIdx, itemIdx, match }) => [menuIdx, mealIdx, optionIdx, itemIdx, match]))
    .toEqual([[0, 0, 0, 0, 'exact'], [0, 0, 1, 0, 'ia'], [1, 0, 0, 0, 'exact']])
})

test('sem kcal da IA e sem casamento: entra com 0 e match "none"', () => {
  const r = dietFromFormat(one([{ nome: 'Lanche', horario: '16:00', alimentos: [{ nome: 'Coisa estranha', gramas: 50, proteinaG: 5 }] }]), T, [])
  expect(r.plan.menus[0].meals[0].options[0].items[0]).toMatchObject({ name: 'Coisa estranha', per100: { kcal: 0, p: 0, c: 0, f: 0 }, source: 'ia' })
  expect(r.items[0].match).toBe('none')
  expect(r.plan.menus[0].goalKcal).toBeUndefined()
  expect(r.plan.menus[0].goalMacros).toBeUndefined()
})

test('taco null: tudo ia e offline true', () => {
  const r = dietFromFormat(one([{ nome: 'Café', horario: '07:00', alimentos: [{ nome: 'Pão, trigo, francês', gramas: 50, kcal: 150 }] }]), null, [])
  expect(r.offline).toBe(true)
  expect(r.items.map((i) => i.match)).toEqual(['ia'])
  expect(r.plan.menus[0].meals[0].options[0].items[0]).toMatchObject({ source: 'ia', per100: { kcal: 300 } })
})

test('exportar e importar de novo mantém alimento criado como custom', () => {
  const bolo: DietItem = { id: 'c1', name: 'Bolo da vó', grams: 100, per100: { kcal: 350, p: 5, c: 50, f: 14.04 }, source: 'custom' }
  const plan: DietPlan = { menus: [{ id: 'A', name: 'Dia de treino', goalKcal: 2000, goalMacros: { p: 140, c: 220, f: 60 }, meals: [{ id: 'm1', name: 'Café', time: '07:00', options: [
    { id: 'o1', name: 'Bolo com pão', items: [
      { ...bolo, id: 'i1', grams: 80, portion: '1 fatia' },
      { id: 'i2', name: 'Pão, trigo, francês', grams: 50, per100: { kcal: 300, p: 8, c: 58.6, f: 3.1 }, source: 'taco', tacoId: 53 },
    ] },
    { id: 'o2', items: [{ ...bolo, id: 'i3' }] },
  ] }] }] }
  const text = exportDietFormat(plan)
  expect(JSON.parse(text)).toEqual({ formato: 'pump-plano', versao: 1, dieta: { cardapios: [{ nome: 'Dia de treino', metaKcal: 2000, macros: { proteinaG: 140, carboG: 220, gorduraG: 60 }, refeicoes: [{ nome: 'Café', horario: '07:00', opcoes: [
    { nome: 'Bolo com pão', alimentos: [
      { nome: 'Bolo da vó', gramas: 80, porcao: '1 fatia', kcal: 280, proteinaG: 4, carboG: 40, gorduraG: 11.2 },
      { nome: 'Pão, trigo, francês', gramas: 50, kcal: 150, proteinaG: 4, carboG: 29.3, gorduraG: 1.6 },
    ] },
    { alimentos: [{ nome: 'Bolo da vó', gramas: 100, kcal: 350, proteinaG: 5, carboG: 50, gorduraG: 14 }] },
  ] }] }] } })
  expect(text).toContain('\n  "versao"')
  const r = dietFromFormat(parseDietFormat(text), T, [bolo])
  expect(r.items.map((i) => i.match)).toEqual(['custom', 'exact', 'custom'])
  const opts = r.plan.menus[0].meals[0].options
  expect(r.plan.menus[0]).toMatchObject({ name: 'Dia de treino', goalKcal: 2000, goalMacros: { p: 140, c: 220, f: 60 } })
  expect(opts[0].name).toBe('Bolo com pão')
  expect(opts[0].items[0]).toEqual({ ...bolo, id: expect.any(String), grams: 80, portion: '1 fatia' })
  expect(opts[0].items[0].id).not.toBe('c1')
  expect(opts[0].items[1]).toMatchObject({ name: 'Pão, trigo, francês', source: 'taco', tacoId: 53 })
})
