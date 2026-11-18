import { readFileSync } from 'node:fs'
import type { TacoFood } from './types'
import { parseDietFormat } from './dietFormat'
import { buildDietPrompt, TACO_EXAMPLES } from './prompt'

test('buildDietPrompt traz perfil e anamnese da dieta; sem perfil pede pra perguntar primeiro', () => {
  const p = buildDietPrompt({
    sex: 'F', heightCm: 165, weightKg: 62.5,
    anamnesis: { goal: 'emagrecer', daysPerWeek: 4, age: 34 },
    dietAnamnesis: { goal: 'perder', meals: 5, wake: '06:30', train: '18:00', sleep: '23:00', restrictions: ['lactose', 'vegetariano'], avoid: ' fígado ', eatOut: 'misto', notes: 'gosto de café' },
  })
  for (const l of ['- Sexo: feminino', '- Idade: 34 anos', '- Altura: 165 cm', '- Peso: 62,5 kg', '- Objetivo no treino: emagrecer', '- Dias de treino por semana: 4',
    '- Objetivo da dieta: perder peso', '- Refeições por dia: 5', '- Acordo às 06:30', '- Treino às 18:00', '- Durmo às 23:00', '- Restrições: sem lactose, vegetariano',
    '- Não como: fígado', '- Onde como: misto (em casa e fora)', '- Observações: gosto de café'])
    expect(p).toContain(l)

  const empty = buildDietPrompt(undefined)
  expect(empty).toContain('- (ainda não contei nada)')
  expect(empty).not.toContain('Objetivo da dieta')
  expect(empty).toContain('me pergunte primeiro')
})

test('prompt respeita 6000 caracteres, o exemplo é um cardápio válido com 2 opções e só quem treina ganha Descanso', () => {
  const empty = buildDietPrompt(undefined)
  expect(empty.length).toBeLessThanOrEqual(6000)
  expect(empty).not.toContain('"Descanso"')
  const example = parseDietFormat(empty)
  expect(example.cardapios[0].refeicoes[0].opcoes).toHaveLength(2)

  const trains = buildDietPrompt({ sex: 'M', heightCm: 180, weightKg: 80, anamnesis: { daysPerWeek: 4 } })
  expect(trains).toContain('2 cardápios')
  expect(trains).toContain('"Dia de treino"')
  expect(trains).toContain('"Descanso"')
})

test('anamnese da dieta inválida vinda de backup não gera linha', () => {
  const p = buildDietPrompt({ sex: 'M', heightCm: 170, weightKg: 70, dietAnamnesis: { goal: 'xyz', restrictions: 'lactose', eatOut: 'lua', notes: 3 } as never })
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
