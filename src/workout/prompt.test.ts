import { buildAdjustPrompt, buildConvertPrompt, buildPrompt } from './prompt'
import { parsePlanFormat } from './planFormat'
import { planWith } from '../../test/helpers'
import { EXERCISE_LIST_URL } from '@/catalog/urls'

test('treino não leva objetivo da dieta nem peso', () => {
  const p = buildPrompt({ sex: 'M', heightCm: 178, dietGoal: 'perder', focus: 'hipertrofia' })
  expect(p).toContain('- Foco: hipertrofia (ganhar massa muscular)')
  expect(p).toBe(buildPrompt({ sex: 'M', heightCm: 178, focus: 'hipertrofia' }))
})
test('prompt leva perfil e anamnese; sem dados manda a IA perguntar', () => {
  const p = buildPrompt({ sex: 'F', heightCm: 165, age: 34, focus: 'hipertrofia', daysPerWeek: 3, notes: ' joelho ', anamnesis: { level: 'iniciante', place: 'casa', split: 'ppl', extras: ['cardio', 'abdomen'], weak: ['peito', 'panturrilha'], minutes: 45 } })
  for (const l of ['- Sexo: feminino', '- Idade: 34 anos', '- Altura: 165 cm', '- Foco: hipertrofia (ganhar massa muscular)', '- Nível: iniciante', '- Onde treino: em casa, com pouco equipamento', '- Dias de treino por semana: 3', '- Divisão preferida: push/pull/legs (empurrar, puxar, pernas)', '- Incluir também: cardio, abdômen', '- Pontos fracos (quero priorizar): peito, panturrilha', '- Tempo por treino: até 45 min, contando o cardio', '- Lesões, limitações ou observações: joelho'])
    expect(p).toContain(l)
  // perfil pulado: o sexo 'M' é só o padrão e não pode ir pro prompt; o foco é o que o formulário já mostra marcado
  const empty = buildPrompt({ sex: 'M', heightCm: 0 })
  expect(empty).toContain('- Foco: hipertrofia (ganhar massa muscular)')
  expect(empty).not.toContain('Sexo')
  expect(empty).toContain('me pergunte primeiro')
})
test('anamnese inválida vinda de backup não quebra nem gera linha vazia', () => {
  const p = buildPrompt({ sex: 'M', heightCm: 170, notes: 3 as never, anamnesis: { extras: 'cardio', weak: ['xyz'] } as never })
  expect(p).toBe(buildPrompt({ sex: 'M', heightCm: 170 }))
})
test('gerar e converter apontam pra lista do catálogo', () => {
  for (const p of [buildPrompt(undefined), buildConvertPrompt()]) expect(p).toContain(EXERCISE_LIST_URL)
})

test('ajustar: leva o plano atual e a lista, e a importação lê o texto de volta', () => {
  const plan = planWith([{ name: 'Supino reto (barra)', sets: 4, reps: '8-10', weightKg: 40, restSec: 90, note: 'pausa' }])
  const p = buildAdjustPrompt(plan)
  expect(p).toContain(EXERCISE_LIST_URL)
  const back = parsePlanFormat(p)
  expect(back.treinos[0].exercicios[0]).toMatchObject({ nome: 'Supino reto (barra)', series: 4, reps: '8-10', cargaKg: 40, descansoSeg: 90, obs: 'pausa' })
})
