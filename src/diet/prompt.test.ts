import { readFileSync } from 'node:fs'
import type { TacoFood } from './types'
import { parseDietFormat } from './dietFormat'
import { buildDietConvertPrompt, buildDietPrompt, TACO_EXAMPLES } from './prompt'
import { FOOD_LIST_URL } from '@/catalog/urls'
import { GOAL_KCAL, MACRO_G, MAX_ITEMS, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'

const T = '2026-11-18'

test('buildDietPrompt traz perfil e anamnese da dieta; sem perfil pede pra perguntar primeiro', () => {
  const p = buildDietPrompt({
    sex: 'F', heightCm: 165,
    age: 34, daysPerWeek: 4, dietGoal: 'perder', wake: '06:30', train: '18:00', sleep: '23:00', notes: 'tenho pouco tempo',
    dietAnamnesis: { meals: 5, restrictions: ['lactose', 'vegetariano'], avoid: ' fígado ', eatOut: 'misto', notes: 'gosto de café' },
  }, [], T)
  for (const l of ['- Sexo: feminino', '- Idade: 34 anos', '- Altura: 165 cm', '- Dias de treino por semana: 4',
    '- Objetivo da dieta: perder peso', '- Refeições por dia: 5', '- Acordo às 06:30', '- Treino às 18:00', '- Durmo às 23:00', '- Restrições: sem lactose, vegetariano',
    '- Não como: fígado', '- Onde como: misto (em casa e fora)', '- Observações gerais: tenho pouco tempo', '- Observações: gosto de café'])
    expect(p).toContain(l)

  const empty = buildDietPrompt(undefined, [], T)
  expect(empty).toContain('- (ainda não contei nada)')
  expect(empty).not.toContain('Objetivo da dieta')
  expect(empty).toContain('me pergunte primeiro')
})

test('prompt respeita 6000 caracteres, o exemplo é um cardápio válido com 2 opções e só quem treina ganha Descanso', () => {
  const empty = buildDietPrompt(undefined, [], T)
  expect(empty.length).toBeLessThanOrEqual(6000)
  expect(empty).not.toContain('"Descanso"')
  const example = parseDietFormat(empty)
  expect(example.cardapios[0].refeicoes[0].opcoes).toHaveLength(2)

  const trains = buildDietPrompt({ sex: 'M', heightCm: 180, daysPerWeek: 4 }, [], T)
  expect(trains).toContain('2 cardápios')
  expect(trains).toContain('"Dia de treino"')
  expect(trains).toContain('"Descanso"')
})

test('anamnese da dieta inválida vinda de backup não gera linha', () => {
  const p = buildDietPrompt({ sex: 'M', heightCm: 170, dietGoal: 'xyz' as never, notes: 3 as never, dietAnamnesis: { restrictions: 'lactose', eatOut: 'lua', notes: 3 } as never }, [], T)
  expect(p).not.toContain('Objetivo da dieta')
  expect(p).not.toContain('Restrições')
  expect(p).not.toContain('Onde como')
  expect(p).not.toContain('Observações:')
})

test('todos os TACO_EXAMPLES existem no taco.json com kcal > 0', () => {
  const kcal = new Map((JSON.parse(readFileSync('public/catalog/taco.json', 'utf8')) as TacoFood[]).map((f) => [f.name, f.kcal]))
  expect(TACO_EXAMPLES.length).toBeGreaterThanOrEqual(12)
  expect(TACO_EXAMPLES.filter((n) => !((kcal.get(n) ?? 0) > 0))).toEqual([])
})

test('dieta leva peso, gordura, massa magra, medidas e variação', () => {
  const p = buildDietPrompt({ sex: 'M', heightCm: 178, dietGoal: 'perder' }, [
    { id: 'a', date: '2026-10-28', weightKg: 83.6 },
    { id: 'b', date: '2026-11-18', weightKg: 82.4, neckCm: 38, waistCm: 92 },
  ], T)
  expect(p).toContain('- Peso: 82,4 kg')
  expect(p).toMatch(/- Gordura corporal \(estimativa US Navy\): \d+,\d%/)
  expect(p).toMatch(/- Massa magra \(estimativa\): \d+,\d kg/)
  expect(p).toContain('- Medidas: pescoço 38 cm, cintura 92 cm')
  expect(p).toContain('- Variação do peso: −1,2 kg em 3 semanas')
  expect(p).toContain('- Objetivo da dieta: perder peso')
})

test('sem pescoço/cintura não tem gordura nem massa magra; uma medição só não tem variação', () => {
  const p = buildDietPrompt({ sex: 'M', heightCm: 178 }, [{ id: 'a', date: T, weightKg: 82.4 }], T)
  expect(p).not.toContain('Gordura')
  expect(p).not.toContain('Massa magra')
  expect(p).not.toContain('Variação')
})

test('converter dieta diz o que fazer quando a fonte não encaixa', () => {
  const p = buildDietConvertPrompt()
  expect(p).toContain('Se faltar a quantidade em gramas, estime pela porção caseira (e ponha a medida em "porcao")')
  expect(p).toContain('se faltar o horário, use um horário comum')
  expect(p).toContain('mais de 4 opções, fique com as 4 primeiras')
})
test('gerar dieta: dieta pronta preserva os números, nomes seguem a lista', () => {
  expect(buildDietPrompt(undefined, [], T)).toContain('transcreva sem mudar os números (quantidades)')
})
test('gerar e converter dieta usam a lista de alimentos e dividem o formato', () => {
  for (const p of [buildDietPrompt(undefined, [], T), buildDietConvertPrompt()]) {
    expect(p).toContain(FOOD_LIST_URL)
    expect(p).toContain('exatamente um nome')
    expect(p).toContain('não conseguir abrir o link')
    expect(p).toContain('"formato": sempre "pump-plano"')
    expect(p).toContain('Pão, trigo, francês')
  }
  expect(buildDietConvertPrompt()).toContain('sem mudar')
  expect(buildDietConvertPrompt()).toContain('mantenha o nome original')
  expect(buildDietConvertPrompt()).toContain('uma opção de cada refeição')
  expect(buildDietConvertPrompt()).toContain('Responda SOMENTE com o JSON')
  expect(buildDietConvertPrompt().length).toBeLessThanOrEqual(6000)
})

test('converter: avisa os limites do formato (vindos das constantes) e o que fazer ao passar deles', () => {
  const p = buildDietConvertPrompt()
  for (const n of [MAX_MENUS, MAX_MEALS, MAX_ITEMS, MAX_OPTIONS, ...GOAL_KCAL, ...MACRO_G]) expect(p).toContain(String(n))
  expect(p).toContain(`mais de ${MAX_MENUS} cardápios, fique com os ${MAX_MENUS} primeiros`)
  expect(p).toContain('arredonde para inteiro')
})

test('as listas pedem pra colar a lista se a IA não abrir o link', () => {
  expect(buildDietConvertPrompt()).toContain('me peça pra colar a lista')
  expect(buildDietPrompt(undefined, [], '2026-01-01')).toContain('me peça pra colar a lista')
})
