import { buildPrompt } from './prompt'

test('treino não leva objetivo da dieta nem peso', () => {
  const p = buildPrompt({ sex: 'M', heightCm: 178, dietGoal: 'perder', focus: 'hipertrofia' })
  expect(p).toContain('- Foco: hipertrofia (ganhar massa muscular)')
  expect(p).not.toMatch(/perder peso|Peso:|Gordura/)
})
