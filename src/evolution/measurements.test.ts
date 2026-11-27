import { previousMeasure, fatSeries, pointAt, removeMeasurement, series, upsertMeasurement } from './measurements'

test('upsertMeasurement junta no mesmo dia, null remove e registro vazio some', () => {
  let r = upsertMeasurement([], '2026-11-17', { weightKg: 80, neckCm: 38 })
  expect(r.status).toBe('saved')
  r = upsertMeasurement(r.list, '2026-11-17', { waistCm: 85 })
  expect(r.list).toHaveLength(1)
  expect(r.list[0]).toMatchObject({ date: '2026-11-17', weightKg: 80, neckCm: 38, waistCm: 85 })
  r = upsertMeasurement(r.list, '2026-11-17', { neckCm: null })
  expect(r.list[0].neckCm).toBeUndefined()
  r = upsertMeasurement(r.list, '2026-11-10', { weightKg: 81 })
  expect(r.list.map((m) => m.date)).toEqual(['2026-11-10', '2026-11-17'])
  const gone = upsertMeasurement(r.list, '2026-11-10', { weightKg: null })
  expect(gone).toMatchObject({ status: 'removed' })
  expect(gone.list.map((m) => m.date)).toEqual(['2026-11-17'])
})
test('upsertMeasurement sem mudança é "same" e não mexe na lista', () => {
  const l = [{ id: 'a', date: '2026-11-17', weightKg: 80, waistCm: 85 }]
  expect(upsertMeasurement(l, '2026-11-17', { weightKg: 80, neckCm: null })).toEqual({ list: l, status: 'same' })
  expect(upsertMeasurement([], '2026-11-17', { weightKg: null })).toEqual({ list: [], status: 'same' })
})
test('removeMeasurement tira o dia todo', () => {
  expect(removeMeasurement([{ id: 'a', date: '2026-11-10', weightKg: 1 }, { id: 'b', date: '2026-11-17', weightKg: 2 }], '2026-11-10')).toEqual([{ id: 'b', date: '2026-11-17', weightKg: 2 }])
})
test('series, fatSeries e pointAt', () => {
  const l = [{ id: 'c', date: '2026-11-17', weightKg: 78.4, neckCm: 38, waistCm: 85 }, { id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-10', waistCm: 84 }]
  const w = series(l, 'weightKg')
  expect(w).toEqual([{ date: '2026-11-01', value: 80 }, { date: '2026-11-17', value: 78.4 }])
  expect(pointAt(w, '2026-11-12')).toEqual({ date: '2026-11-12', value: 80 })
  expect(pointAt(w, '2026-10-01')).toBeUndefined()
  expect(pointAt([], '2026-11-12')).toBeUndefined()
  expect(fatSeries({ sex: 'M', heightCm: 178 }, l)).toEqual([{ date: '2026-11-17', value: 18.4 }])
})

test('a referência usa a última medida do campo estritamente anterior ao dia editado', () => {
  const entries = [
    { id: '3', date: '2026-11-03', weightKg: 79 },
    { id: '1', date: '2026-11-01', waistCm: 85 },
    { id: '2', date: '2026-11-02', weightKg: 80 },
  ]
  expect(previousMeasure(entries, 'waistCm', '2026-11-03')).toEqual({ date: '2026-11-01', value: 85 })
  expect(previousMeasure(entries, 'weightKg', '2026-11-03')).toEqual({ date: '2026-11-02', value: 80 })
  expect(previousMeasure(entries, 'weightKg', '2026-11-02')).toBeUndefined()
})
