import { planOf } from '../../test/helpers'
import { savePlan } from './plan'

const ids = (p: { workouts: { id: string }[] }) => p.workouts.map((w) => w.id)

test('savePlan: treino reordenado pelo arquivo mantém o id pelo nome', () => {
  const prev = planOf([{ id: 'p', label: 'A', name: 'Peito' }, { id: 'l', label: 'B', name: 'Pernas' }])
  const next = planOf([{ id: 'n1', label: 'A', name: 'Pernas' }, { id: 'n2', label: 'B', name: 'Peito' }])
  expect(ids(savePlan(prev, next))).toEqual(['l', 'p'])
})

test('savePlan: sem nome igual, cai na letra', () => {
  const prev = planOf([{ id: 'p', label: 'A', name: 'Peito' }])
  expect(ids(savePlan(prev, planOf([{ id: 'n', label: 'A', name: 'Peito e ombro' }])))).toEqual(['p'])
})

test('savePlan: id que veio do editor fica, mesmo em outra posição', () => {
  const prev = planOf([{ id: 'p', label: 'A', name: 'Peito' }, { id: 'l', label: 'B', name: 'Pernas' }])
  const next = planOf([{ id: 'l', label: 'A', name: 'Pernas' }, { id: 'p', label: 'B', name: 'Peito' }])
  expect(ids(savePlan(prev, next))).toEqual(['l', 'p'])
})
