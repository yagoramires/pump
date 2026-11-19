import { readFileSync } from 'node:fs'
import type { Exercise } from './types'
import { TEMPLATES, instantiateTemplate } from './templates'

const catalog: Exercise[] = JSON.parse(readFileSync('public/catalog/exercises.json', 'utf8'))
test('todos os ids dos planos prontos existem no catálogo', () => {
  const ids = new Set(catalog.map(e => e.id))
  for (const t of TEMPLATES) for (const w of t.workouts) for (const id of w.exerciseIds) expect(ids.has(id), `${t.id}:${id}`).toBe(true)
})
test('instanciar copia nome e fotos do catálogo; id fora do catálogo fica de fora', () => {
  const [first, ...rest] = TEMPLATES[0].workouts[0].exerciseIds
  const p = instantiateTemplate(TEMPLATES[0], catalog)
  const src = catalog.find(e => e.id === first)!
  expect(p.workouts[0]).toMatchObject({ label: 'A', name: TEMPLATES[0].workouts[0].name })
  expect(p.workouts[0].exercises[0]).toMatchObject({ exerciseId: first, name: src.name, images: src.images })
  expect(instantiateTemplate(TEMPLATES[0], catalog.filter(e => e.id !== first)).workouts[0].exercises.map(e => e.exerciseId)).toEqual(rest)
})
