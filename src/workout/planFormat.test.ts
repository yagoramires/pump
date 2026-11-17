import { ex } from '../../test/helpers'
import type { WorkoutPlan } from '../types'
import { readFileSync } from 'node:fs'
import { buildPrompt, exportPlanFormat, parsePlanFormat, planFromFormat, type PlanFormatError } from './planFormat'
import { normalize } from '../catalog/search'

const ok = { formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg', 'qui'], exercicios: [{ nome: 'supino reto com barra', series: 4, reps: 10, cargaKg: 40 }, { nome: 'Remada na máquina do Zé', series: 3, reps: '12', obs: 'banco 3' }] }] }
const catalog = [ex('Supino reto com barra', { id: 'Barbell_Bench_Press_-_Medium_Grip' })]
const noId = (p: WorkoutPlan) => p.workouts.map(({ id: _id, ...w }) => w)

test('aceita JSON dentro de bloco de código da resposta da IA', () => {
  expect(parsePlanFormat('Aqui está:\n```json\n' + JSON.stringify(ok) + '\n```\nBom treino!').treinos[0].exercicios[0].reps).toBe('10')
})
test('lista todos os problemas em pt-BR, na ordem', () => {
  const bad = { formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'X', dias: ['segunda'], exercicios: [{ nome: '', series: 'quatro', reps: '10' }] }, { letra: 'A', nome: '', dias: [], exercicios: [] }] }
  try { parsePlanFormat(JSON.stringify(bad)); throw new Error('não lançou') }
  catch (e) { expect((e as PlanFormatError).problems).toEqual([
    'Treino A: dia "segunda" inválido (use seg, ter, qua, qui, sex, sab, dom)',
    'Treino A, exercício 1: "nome" vazio',
    'Treino A, exercício 1: "series" precisa ser um número inteiro de 1 a 20',
    'Treino A: "letra" repetida',
    'Treino A: "nome" vazio',
    'Treino A: precisa ter pelo menos um exercício',
  ]) }
})
test('recusa texto sem JSON, outro formato ou versão mais nova', () => {
  expect(() => parsePlanFormat('oi')).toThrow('Não encontrei um plano em JSON no texto')
  expect(() => parsePlanFormat('{"formato":"x","versao":1,"treinos":[]}')).toThrow()
  expect(() => parsePlanFormat('{"formato":"pump-plano","versao":2,"treinos":[]}')).toThrow('Versão 2 não suportada (este app lê a versão 1)')
})
test('aceita sáb e valida carga e descanso', () => {
  const t = { letra: 'A', nome: 'X', dias: ['sáb'], exercicios: [{ nome: 'a', series: 3, reps: '8', cargaKg: -1, descansoSeg: 1.5 }] }
  try { parsePlanFormat(JSON.stringify({ ...ok, treinos: [t] })); throw new Error('não lançou') }
  catch (e) { expect((e as PlanFormatError).problems).toEqual([
    'Treino A, exercício 1: "cargaKg" precisa ser um número maior ou igual a 0',
    'Treino A, exercício 1: "descansoSeg" precisa ser um número inteiro maior ou igual a 0',
  ]) }
  expect(parsePlanFormat(JSON.stringify({ ...ok, treinos: [{ ...t, exercicios: [{ nome: 'a', series: 3, reps: '8' }] }] })).treinos[0].dias).toEqual(['sab'])
})
test('recusa carga infinita (1e999 no JSON)', () => {
  const t = { letra: 'A', nome: 'X', dias: ['seg'], exercicios: [{ nome: 'a', series: 3, reps: '8', cargaKg: 0 }] }
  const text = JSON.stringify({ ...ok, treinos: [t] }).replace('"cargaKg":0', '"cargaKg":1e999')
  try { parsePlanFormat(text); throw new Error('não lançou') }
  catch (e) { expect((e as PlanFormatError).problems).toEqual(['Treino A, exercício 1: "cargaKg" precisa ser um número maior ou igual a 0']) }
})
test('os nomes de exemplo do prompt existem no catálogo', () => {
  const names = new Set((JSON.parse(readFileSync('public/catalog/exercises.json', 'utf8')) as { name: string }[]).map((e) => normalize(e.name)))
  const examples = [...buildPrompt().matchAll(/"nome": "([^"]+)"|\(ex\.: ([^)]+)\)/g)].flatMap((m) => m[1] ? [m[1]] : [...m[2].matchAll(/"([^"]+)"/g)].map((q) => q[1]))
  const exercises = examples.filter((n) => n !== 'Peito e tríceps')
  expect(exercises.length).toBeGreaterThan(4)
  expect(exercises.filter((n) => !names.has(normalize(n)))).toEqual([])
})
test('casa com o catálogo ignorando acento/caixa; o resto vira exercício seu', () => {
  const r = planFromFormat(parsePlanFormat(JSON.stringify(ok)), catalog, [])
  const [w] = r.plan.workouts
  expect(w).toMatchObject({ label: 'A', name: 'Peito', weekdays: [1, 4] })
  expect(w.exercises[0]).toMatchObject({ exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', sets: 4, reps: '10', weightKg: 40, restSec: 90 })
  expect(w.exercises[1]).toMatchObject({ custom: true, name: 'Remada na máquina do Zé', weightKg: 0, note: 'banco 3' })
  expect(r.unmatched).toEqual(['Remada na máquina do Zé'])
  expect(r.newCustoms).toHaveLength(1)
})
test('mesmo nome sem par duas vezes reaproveita um só exercício seu', () => {
  const two = { ...ok, treinos: [ok.treinos[0], { ...ok.treinos[0], letra: 'B', dias: ['ter'] }] }
  expect(planFromFormat(parsePlanFormat(JSON.stringify(two)), catalog, []).newCustoms).toHaveLength(1)
})
test('exportar e reimportar devolve o mesmo plano (fora os ids)', () => {
  const r = planFromFormat(parsePlanFormat(JSON.stringify(ok)), catalog, [])
  const again = planFromFormat(parsePlanFormat(JSON.stringify(exportPlanFormat(r.plan))), catalog, r.newCustoms)
  expect(noId(again.plan)).toEqual(noId(r.plan))
  expect(again.unmatched).toEqual([])
})
test('dieta presente é ignorada com aviso nesta fase', () =>
  expect(planFromFormat({ ...parsePlanFormat(JSON.stringify(ok)), dieta: {} }, catalog, []).ignoredDiet).toBe(true))
test('prompt leva perfil e anamnese; sem dados manda a IA perguntar', () => {
  const p = buildPrompt({ sex: 'F', heightCm: 165, weightKg: 62.5, anamnesis: { goal: 'emagrecer', level: 'iniciante', place: 'casa', daysPerWeek: 3, age: 34, minutes: 45, notes: ' joelho ' } })
  for (const l of ['- Sexo: feminino', '- Idade: 34 anos', '- Altura: 165 cm', '- Peso: 62,5 kg', '- Objetivo: emagrecer', '- Nível: iniciante', '- Onde treino: em casa, com pouco equipamento', '- Dias por semana: 3', '- Tempo por treino: até 45 min', '- Lesões, limitações ou preferências: joelho'])
    expect(p).toContain(l)
  // perfil pulado: o sexo 'M' é só o padrão e não pode ir pro prompt
  const empty = buildPrompt({ sex: 'M', heightCm: 0, weightKg: 0 })
  expect(empty).toContain('- (ainda não contei nada)')
  expect(empty).not.toContain('Sexo')
  expect(empty).toContain('me pergunte primeiro')
})
