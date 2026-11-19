import { buildConvertPrompt, buildPrompt } from './prompt'
import { EXERCISE_LIST_URL } from '@/catalog/urls'

test('treino não leva objetivo da dieta nem peso', () => {
  const p = buildPrompt({ sex: 'M', heightCm: 178, dietGoal: 'perder', focus: 'hipertrofia' })
  expect(p).toContain('- Foco: hipertrofia (ganhar massa muscular)')
  expect(p).not.toMatch(/perder peso/)
})
test('prompt leva perfil e anamnese; sem dados manda a IA perguntar', () => {
  const p = buildPrompt({ sex: 'F', heightCm: 165, age: 34, focus: 'hipertrofia', daysPerWeek: 3, notes: ' joelho ', anamnesis: { level: 'iniciante', place: 'casa', split: 'ppl', extras: ['cardio', 'abdomen'], weak: ['peito', 'panturrilha'], minutes: 45 } })
  for (const l of ['- Sexo: feminino', '- Idade: 34 anos', '- Altura: 165 cm', '- Foco: hipertrofia (ganhar massa muscular)', '- Nível: iniciante', '- Onde treino: em casa, com pouco equipamento', '- Dias por semana: 3', '- Divisão preferida: push/pull/legs (empurrar, puxar, pernas)', '- Incluir também: cardio, abdômen', '- Pontos fracos (quero priorizar): peito, panturrilha', '- Tempo por treino: até 45 min, contando o cardio', '- Lesões, limitações ou observações: joelho'])
    expect(p).toContain(l)
  // perfil pulado: o sexo 'M' é só o padrão e não pode ir pro prompt
  const empty = buildPrompt({ sex: 'M', heightCm: 0 })
  expect(empty).toContain('- (ainda não contei nada)')
  expect(empty).not.toContain('Sexo')
  expect(empty).toContain('me pergunte primeiro')
})
test('anamnese inválida vinda de backup não quebra nem gera linha vazia', () => {
  const p = buildPrompt({ sex: 'M', heightCm: 170, notes: 3 as never, anamnesis: { extras: 'cardio', weak: ['xyz'] } as never })
  expect(p).not.toContain('Incluir também')
  expect(p).not.toContain('Pontos fracos')
  expect(p).not.toContain('Lesões, limitações ou observações:')
})
test('prompt do treino não pede dias', () => {
  expect(buildPrompt(undefined)).not.toContain('"dias"')
  expect(buildPrompt(undefined)).toContain('na ordem da lista')
})
test('gerar e converter usam a lista do catálogo, só o nome, e dividem o formato', () => {
  for (const p of [buildPrompt(undefined), buildConvertPrompt()]) {
    expect(p).toContain(EXERCISE_LIST_URL)
    expect(p).toContain('exatamente um nome')
    expect(p).toContain('não conseguir abrir o link')
    expect(p).toContain('sem o que está entre parênteses')
    expect(p).toContain('"formato": sempre "pump-plano"')
  }
  expect(buildPrompt(undefined)).not.toContain('como se fala em academia')
  expect(buildConvertPrompt()).toContain('sem mudar')
  expect(buildConvertPrompt()).toContain('mantenha o nome original')
  expect(buildConvertPrompt()).toContain('Responda SOMENTE com o JSON')
})
