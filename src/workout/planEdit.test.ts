import { pe, planOf, workoutOf } from '../../test/helpers'
import { addWorkout, fromEditor, moveExercise, moveWorkout, muscleSplit, relabel, removeWorkout, toEditor } from './planEdit'

const ppl = () => toEditor(planOf([{ id: 'p', label: 'A', name: 'Peito' }, { id: 'c', label: 'B', name: 'Costas' }, { id: 'l', label: 'C', name: 'Pernas' }]))
const names = (p: { workouts: { name: string }[] }) => p.workouts.map((w) => w.name)
const labels = (p: { workouts: { label: string }[] }) => p.workouts.map((w) => w.label)

test('relabel refaz as letras pela posição e o start segue o mesmo treino', () => {
  const p = { workouts: [{ id: 'c', label: 'C' }, { id: 'a', label: 'A' }], start: { label: 'C', since: 'x' } }
  expect(relabel(p)).toEqual({ workouts: [{ id: 'c', label: 'A' }, { id: 'a', label: 'B' }], start: { label: 'A', since: 'x' } })
})

test('relabel tira o start quando o treino dele saiu', () => {
  expect(relabel({ workouts: [{ id: 'a', label: 'A' }], start: { label: 'B', since: 'x' } }).start).toBeUndefined()
})

test('moveWorkout leva o C pro começo e ele vira A, com o mesmo id', () => {
  const p = moveWorkout(ppl(), 2, 0)
  expect(labels(p)).toEqual(['A', 'B', 'C'])
  expect(names(p)).toEqual(['Pernas', 'Peito', 'Costas'])
  expect(p.workouts.map((w) => w.id)).toEqual(['l', 'p', 'c'])
})

test('removeWorkout refaz as letras', () => {
  const p = removeWorkout(ppl(), 'c')
  expect(labels(p)).toEqual(['A', 'B'])
  expect(names(p)).toEqual(['Peito', 'Pernas'])
})

test('addWorkout usa a próxima letra', () => {
  const w = addWorkout(toEditor(planOf([{ id: 'p', label: 'A' }, { id: 'c', label: 'B' }]))).workouts[2]
  expect(w).toMatchObject({ label: 'C', name: 'Treino C', exercises: [] })
})

test('addWorkout não passa de 26 treinos', () => {
  const full = toEditor({ workouts: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((label) => workoutOf([], { id: label, label })) })
  expect(addWorkout(full)).toBe(full)
})

const exNames = (p: ReturnType<typeof toEditor>, i: number) => p.workouts[i].exercises.map((e) => e.name)

test('moveExercise reordena dentro do treino', () => {
  const p = toEditor({ workouts: [workoutOf([{ name: 's1' }, { name: 's2' }, { name: 's3' }], { id: 'a' })] })
  expect(exNames(moveExercise(p, { wid: 'a', index: 0 }, { wid: 'a', index: 2 }), 0)).toEqual(['s2', 's3', 's1'])
})

test('moveExercise leva do A pro B na posição pedida', () => {
  const p = toEditor({ workouts: [workoutOf([{ name: 'x' }, { name: 'y' }], { id: 'a' }), workoutOf([{ name: 'z' }], { id: 'b', label: 'B' })] })
  const r = moveExercise(p, { wid: 'a', index: 0 }, { wid: 'b', index: 1 })
  expect(exNames(r, 0)).toEqual(['y'])
  expect(exNames(r, 1)).toEqual(['z', 'x'])
})

test('fromEditor(toEditor(plan)) devolve o plano igual, sem key', () => {
  const plan = { workouts: [workoutOf([{ name: 'Supino' }, { name: 'Crucifixo' }], { id: 'a' })], start: { label: 'A', since: 'x' } }
  const back = fromEditor(toEditor(plan))
  expect(back).toEqual(plan)
  expect(back.workouts[0].exercises.some((e) => 'key' in e)).toBe(false)
})

test('toEditor dá uma chave diferente pra cada exercício', () => {
  const keys = toEditor({ workouts: [workoutOf([{}, {}])] }).workouts[0].exercises.map((e) => e.key)
  expect(new Set(keys).size).toBe(2)
})

test('muscleSplit conta por grupo, ignora cardio e ordena', () => {
  const exs = [pe({ muscles: ['peito'] }), pe({ muscles: ['tríceps'] }), pe({ muscles: ['peito'] }), pe({ muscles: ['quadríceps'], sets: 1, reps: '20 min' })]
  expect(muscleSplit(exs)).toEqual([{ token: 'c2', label: 'peito', count: 2 }, { token: 'c3', label: 'braços', count: 1 }])
})

test('addWorkout em plano antigo com letra pulada (A, C) não repete letra', () => {
  const p = addWorkout(toEditor(planOf([{ id: 'a', label: 'A', name: 'Peito' }, { id: 'c', label: 'C', name: 'Pernas' }])))
  expect(labels(p)).toEqual(['A', 'B', 'C'])
  expect(names(p)).toEqual(['Peito', 'Pernas', 'Treino C'])
})
