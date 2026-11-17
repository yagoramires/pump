import { firstLast, nearest, upsertMeasurement } from './measurements'

test('upsertMeasurement junta no mesmo dia, null remove e registro vazio some', () => {
  let l = upsertMeasurement([], '2026-11-17', { weightKg: 80, neckCm: 38 })
  l = upsertMeasurement(l, '2026-11-17', { waistCm: 85 })
  expect(l).toHaveLength(1)
  expect(l[0]).toMatchObject({ date: '2026-11-17', weightKg: 80, neckCm: 38, waistCm: 85 })
  l = upsertMeasurement(l, '2026-11-17', { neckCm: null })
  expect(l[0].neckCm).toBeUndefined()
  l = upsertMeasurement(l, '2026-11-10', { weightKg: 81 })
  expect(l.map((m) => m.date)).toEqual(['2026-11-10', '2026-11-17'])
  expect(upsertMeasurement(l, '2026-11-10', { weightKg: null }).map((m) => m.date)).toEqual(['2026-11-17'])
})
test('firstLast e nearest', () => {
  const l = [{ id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-10', waistCm: 84 }, { id: 'c', date: '2026-11-17', weightKg: 78.4 }]
  expect(firstLast(l, 'weightKg')).toEqual({ first: { date: '2026-11-01', value: 80 }, last: { date: '2026-11-17', value: 78.4 } })
  expect(nearest(l, '2026-11-12', 'weightKg')).toBe(80)
})
