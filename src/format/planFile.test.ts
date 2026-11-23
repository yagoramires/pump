import type { Exercise, TacoFood } from '@/catalog/types'
import type { DietPlan } from '@/diet/types'
import type { WorkoutPlan } from '@/workout/types'
import { dietFromFormat, exportDietFormat, parseDietFormat } from '@/diet/dietFormat'
import { parsePlanFormat } from '@/workout/planFormat'
import { halvesIn } from './envelope'
import { planFileName, planFileText, readPlanFile } from './planFile'

const supino: Exercise = { id: 'sup', name: 'Supino reto', muscles: ['peito'], equipment: 'barra', instructions: [], images: [] }
const frangoTaco: TacoFood = { id: 9, name: 'Frango, peito, grelhado', kcal: 159, p: 32, c: 0, f: 2.5 }
const load = { exercises: async () => [supino], taco: async () => [frangoTaco] }

const workout: WorkoutPlan = {
  workouts: [{
    id: 'w', label: 'A', name: 'Peito',
    exercises: [{ exerciseId: 'sup', name: 'Supino reto', muscles: ['peito'], images: [], instructions: [], sets: 4, reps: '8-10', weightKg: 60, restSec: 90, note: 'pausa no peito' }],
  }],
}
const diet: DietPlan = {
  menus: [{
    id: 'm', name: 'Base',
    meals: [{
      id: 'r', name: 'Almoço', time: '12:00',
      options: [{ id: 'o', items: [{ id: 'i', name: 'Frango grelhado', grams: 100, portion: '1 filé', per100: { kcal: 160, p: 30, c: 0, f: 4 }, source: 'ia' }] }],
    }],
  }],
}

test('treino: exportar e ler de volta devolve nomes, séries, reps, carga, descanso e obs', async () => {
  const back = await readPlanFile(planFileText({ workout }), load)
  expect(back.diet).toBeUndefined()
  const [e] = back.workout!.workouts[0].exercises
  expect(back.workout!.workouts[0]).toMatchObject({ label: 'A', name: 'Peito' })
  expect(e).toMatchObject({ name: 'Supino reto', sets: 4, reps: '8-10', weightKg: 60, restSec: 90, note: 'pausa no peito' })
})

test('dieta: alimento "ia" parecido com um da TACO volta com o mesmo nome, porção e valores', async () => {
  const back = await readPlanFile(planFileText({ diet }), load)
  const [it] = back.diet!.menus[0].meals[0].options[0].items
  expect(it).toMatchObject({ name: 'Frango grelhado', grams: 100, portion: '1 filé', source: 'ia' })
  expect(it.per100).toEqual({ kcal: 160, p: 30, c: 0, f: 4 })
})

test('a mesma dieta, vinda de IA (sem origem), ainda troca pelo parecido da TACO', () => {
  const r = dietFromFormat(parseDietFormat(exportDietFormat(diet)), [frangoTaco], [])
  expect(r.plan.menus[0].meals[0].options[0].items[0].name).toBe('Frango, peito, grelhado')
})

test('arquivo com as duas metades preenche treino e dieta', async () => {
  const text = planFileText({ workout, diet })
  expect(halvesIn(text).sort()).toEqual(['dieta', 'treinos'])
  const back = await readPlanFile(text, load)
  expect(back.workout?.workouts).toHaveLength(1)
  expect(back.diet?.menus).toHaveLength(1)
})

test('arquivo sem plano dá erro de formato', async () => {
  await expect(readPlanFile('oi', load)).rejects.toThrow('Não encontrei um plano do Pump no arquivo')
})

test('o arquivo marca a origem e o leitor da versão 1 continua lendo', () => {
  const text = planFileText({ workout })
  expect(JSON.parse(text)).toMatchObject({ formato: 'pump-plano', versao: 1, origem: 'pump' })
  expect(() => parsePlanFormat(text)).not.toThrow()
})

test('planFileName pelo que tem dentro', () => {
  const d = new Date(2026, 10, 23)
  expect(planFileName({ workout }, d)).toBe('pump-treino-2026-11-23.json')
  expect(planFileName({ diet }, d)).toBe('pump-dieta-2026-11-23.json')
  expect(planFileName({ workout, diet }, d)).toBe('pump-plano-2026-11-23.json')
})

test('treino: exercício próprio "Supino (barra)" não vira o "Supino" do catálogo', async () => {
  const cat: Exercise = { id: 'c1', name: 'Supino', muscles: ['peito'], equipment: 'barra', instructions: [], images: [] }
  const mine: WorkoutPlan = { workouts: [{ ...workout.workouts[0], exercises: [{ ...workout.workouts[0].exercises[0], exerciseId: 'meu', name: 'Supino (barra)', custom: true }] }] }
  const back = await readPlanFile(planFileText({ workout: mine }), { exercises: async () => [cat], taco: async () => [] })
  expect(back.workout!.workouts[0].exercises[0].name).toBe('Supino (barra)')
})
