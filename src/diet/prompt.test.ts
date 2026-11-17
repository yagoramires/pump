import { readFileSync } from 'node:fs'
import type { TacoFood } from '../types'
import { buildDietPrompt, TACO_EXAMPLES } from './prompt'

test('buildDietPrompt traz perfil, anamnese da dieta, padrão TACO e formato, sem passar de 6000 caracteres sem os dados', () => {
  const p = buildDietPrompt({
    sex: 'F', heightCm: 165, weightKg: 62.5,
    anamnesis: { goal: 'emagrecer', daysPerWeek: 4, age: 34 },
    dietAnamnesis: { goal: 'perder', meals: 5, wake: '06:30', train: '18:00', sleep: '23:00', restrictions: ['lactose', 'vegetariano'], avoid: ' fígado ', eatOut: 'misto', notes: 'gosto de café' },
  })
  for (const l of ['- Sexo: feminino', '- Idade: 34 anos', '- Altura: 165 cm', '- Peso: 62,5 kg', '- Objetivo no treino: emagrecer', '- Dias de treino por semana: 4',
    '- Objetivo da dieta: perder peso', '- Refeições por dia: 5', '- Acordo às 06:30', '- Treino às 18:00', '- Durmo às 23:00', '- Restrições: sem lactose, vegetariano',
    '- Não como: fígado', '- Onde como: misto (em casa e fora)', '- Observações: gosto de café'])
    expect(p).toContain(l)
  expect(p).toContain('TACO 4ª edição')
  expect(p).toContain('Arroz, tipo 1, cozido')
  expect(p).toContain('"refeicoes"')

  const empty = buildDietPrompt(undefined)
  expect(empty.length).toBeLessThanOrEqual(6000)
  expect(empty).toContain('- (ainda não contei nada)')
  expect(empty).not.toContain('Objetivo da dieta')
  expect(empty).toContain('me pergunte primeiro')
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
  const prompt = buildDietPrompt()
  for (const n of TACO_EXAMPLES) expect(prompt).toContain(`"${n}"`)
})
