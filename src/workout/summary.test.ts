import { pe } from '../../test/helpers'
import { exerciseCount, exerciseMarks, feelingOf, formatDuration, highlightText, muscleLevels, plannedSets, sessionHighlight, volumeCoverage, weekDays } from './summary'
import type { WorkoutSession } from './types'

/** sets: [kg, reps] */
const sx = (date: string, exs: Record<string, [number, number][]>, at = '10:00'): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'Treino A', completedAt: `${date}T${at}:00`,
  exercises: Object.entries(exs).map(([id, sets]) => ({ ...pe({ exerciseId: id, name: id }), sets: sets.map(([weightKg, reps]) => ({ weightKg, reps: String(reps) })) })),
})
const logOf = (...ss: WorkoutSession[]): WorkoutSession[] => ss

test('formatDuration', () => {
  expect([0, 52, 60, 104].map(formatDuration)).toEqual(['<1 min', '52 min', '1 h 00', '1 h 44'])
})

test('contagens: exercícios distintos com série feita, séries planejadas, volume e cobertura', () => {
  const s = sx('2026-11-16', { Supino: [[60, 10], [60, 8]], Barra: [[0, 12]] })
  s.exercises.push({ ...pe({ exerciseId: 'Supino', name: 'Supino' }), sets: [null] })
  s.exercises.push({ ...pe({ exerciseId: 'Prancha', reps: '30 s' }), sets: [{ weightKg: 10, reps: '30 s' }] })
  expect(exerciseCount(s)).toBe(3)
  expect(plannedSets(s)).toBe(5)
  expect(volumeCoverage(s)).toEqual({ kg: 1080, counted: 2, total: 4 })
})

describe('recorde e melhora', () => {
  const mark = (prev: WorkoutSession[], today: WorkoutSession) => exerciseMarks(logOf(...prev, today), today).get('Supino')

  test.each([
    // histórico, última, hoje → resultado (CA13 da spec original)
    [8, 8, 10, 'record'],
    [12, 8, 10, 'improved'],
    [12, 12, 12, undefined],
    [12, 10, 8, undefined],
  ])('mesma carga: melhor %i, última %i, hoje %i → %s', (best, last, today, kind) => {
    const m = mark([sx('2026-11-01', { Supino: [[60, best]] }), sx('2026-11-08', { Supino: [[60, last]] })], sx('2026-11-16', { Supino: [[60, today]] }))
    expect(m?.record ? 'record' : m?.improved ? 'improved' : undefined).toBe(kind)
  })

  test('recorde de carga, primeira vez não é recorde, peso do corpo fica de fora', () => {
    expect(mark([sx('2026-11-08', { Supino: [[60, 10]] })], sx('2026-11-16', { Supino: [[65, 6]] }))?.record).toEqual({ kind: 'load', kg: 65, reps: 6, prevKg: 60, prevReps: 10 })
    expect(mark([], sx('2026-11-16', { Supino: [[60, 10]] }))).toEqual({ name: 'Supino', record: undefined, improved: undefined })
    expect(mark([sx('2026-11-08', { Supino: [[0, 10]] })], sx('2026-11-16', { Supino: [[0, 15]] }))?.record).toBeUndefined()
  })

  test('várias cargas batem marca: vale a maior; melhora de carga exige reps iguais ou maiores', () => {
    const prev = sx('2026-11-08', { Supino: [[60, 8], [65, 5]] })
    expect(mark([prev], sx('2026-11-16', { Supino: [[60, 9], [65, 6]] }))?.record).toMatchObject({ kind: 'reps', kg: 65, reps: 6, prevReps: 5 })
    const old = sx('2026-11-01', { Supino: [[80, 5]] })
    const last = sx('2026-11-08', { Supino: [[60, 8]] })
    expect(mark([old, last], sx('2026-11-16', { Supino: [[65, 8]] }))?.improved).toMatchObject({ kind: 'load', kg: 65, date: '2026-11-08' })
    expect(mark([old, last], sx('2026-11-16', { Supino: [[65, 6]] }))?.improved).toBeUndefined()
  })
})

describe('destaque', () => {
  test('primeiro treino, inclusive com extra no mesmo dia depois', () => {
    const a = sx('2026-11-16', { Supino: [[60, 10]] }, '10:00')
    const extra = { ...sx('2026-11-16', { Remada: [[40, 10]] }, '11:00'), workoutId: 'extra' }
    expect(sessionHighlight(logOf(a), a, 4)).toEqual({ kind: 'first' })
    expect(sessionHighlight(logOf(a, extra), extra, 4).kind).not.toBe('first')
  })

  test('recorde > meta > melhora > neutro', () => {
    const seg = sx('2026-11-16', { Supino: [[60, 8]] })
    const ter = sx('2026-11-17', { Supino: [[60, 10]] })
    expect(sessionHighlight(logOf(seg, ter), ter, 2).kind).toBe('record')
    const qua = sx('2026-11-18', { Supino: [[60, 10]] })
    expect(sessionHighlight(logOf(seg, ter, qua), qua, 3)).toEqual({ kind: 'goal', goal: 3 })
    expect(sessionHighlight(logOf(seg, ter, qua), qua, 4).kind).toBe('neutral')
  })

  test('meta: só a primeira sessão do dia que fecha a meta; semana seg–dom', () => {
    const dom = sx('2026-11-15', { X: [[10, 10]] })
    const seg = sx('2026-11-16', { X: [[10, 10]] }, '10:00')
    const segExtra = { ...sx('2026-11-16', { Y: [[10, 10]] }, '18:00'), workoutId: 'extra' }
    const log = logOf(dom, seg, segExtra)
    expect(weekDays(log, seg)).toBe(1)
    expect(sessionHighlight(log, seg, 1).kind).toBe('goal')
    expect(sessionHighlight(log, segExtra, 1).kind).not.toBe('goal')
  })

  test('texto com e sem cargas', () => {
    const h = { kind: 'improved', name: 'Agachamento', mark: { kind: 'reps', kg: 40, reps: 8, prevReps: 6, date: '2026-11-15' } } as const
    expect(highlightText(h)).toEqual({ title: 'Melhorou desde a última vez', detail: 'Agachamento · 40 kg × 8 (antes × 6, em 15/11)' })
    expect(highlightText(h, false).detail).toBe('Agachamento')
  })
})

test('esforço antigo lido por faixa', () => {
  expect([1, 4, 5, 7, 8, 10, undefined].map(feelingOf)).toEqual(['leve', 'leve', 'medida', 'medida', 'puxado', 'puxado', undefined])
})

test('músculos: principal vence, personalizado é todo principal, plano antigo usa catálogo ou o 1º', () => {
  const done = [{ weightKg: 10, reps: '10' }]
  const exs = [
    { ...pe({ exerciseId: 'agach', muscles: ['quadríceps', 'glúteos', 'lombar'], primary: ['quadríceps'] }), sets: done },
    { ...pe({ exerciseId: 'stiff', muscles: ['posteriores de coxa', 'glúteos'] }), sets: done },
    { ...pe({ exerciseId: 'antigo', muscles: ['lombar', 'glúteos'] }), sets: done },
    { ...pe({ exerciseId: 'meu', muscles: ['panturrilhas', 'adutores'], custom: true }), sets: done },
    { ...pe({ exerciseId: 'nao-fiz', muscles: ['peito'] }), sets: [null] },
  ]
  expect(Object.fromEntries(muscleLevels(exs.filter((e) => e.sets.some(Boolean)), new Map([['stiff', ['posteriores de coxa']]])))).toEqual({
    adutores: 'primary', panturrilhas: 'primary', glúteos: 'secondary', 'posteriores de coxa': 'primary', lombar: 'primary', quadríceps: 'primary',
  })
})
