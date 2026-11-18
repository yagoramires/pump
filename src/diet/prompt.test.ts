import { readFileSync } from 'node:fs'
import type { TacoFood } from './types'
import { parseDietFormat } from './dietFormat'
import { buildDietPrompt, TACO_EXAMPLES } from './prompt'

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
