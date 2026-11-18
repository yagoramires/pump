import { readFileSync } from 'node:fs'
import type { Exercise } from './types'
import { TEMPLATES, instantiateTemplate } from './templates'
import { PLAN_DEFAULTS, toPlanExercise } from './exercises'

const catalog: Exercise[] = JSON.parse(readFileSync('public/catalog/exercises.json', 'utf8'))
test('todos os ids dos planos prontos existem no catálogo', () => {
  const ids = new Set(catalog.map(e => e.id))
  for (const t of TEMPLATES) for (const w of t.workouts) for (const id of w.exerciseIds) expect(ids.has(id), `${t.id}:${id}`).toBe(true)
})
test('instanciar copia dados do catálogo e aplica padrões', () => {
  const p = instantiateTemplate(TEMPLATES[0], catalog)
  const pe = p.workouts[0].exercises[0]
  expect(pe).toMatchObject(PLAN_DEFAULTS)
  expect(pe.name).toBe(catalog.find(e => e.id === pe.exerciseId)!.name)
  expect(p.workouts[0]).toMatchObject({ label: 'A' })
})
test('exercício criado vira PlanExercise sem fotos e com observação', () =>
  expect(toPlanExercise({ id: 'custom-1', name: 'Remada na máquina X', muscles: ['dorsais'], note: 'banco 3' }))
    .toMatchObject({ exerciseId: 'custom-1', custom: true, images: [], instructions: [], note: 'banco 3', ...PLAN_DEFAULTS }))
