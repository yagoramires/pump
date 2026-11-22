import { PROFILES, RICH, RICH_TODAYS } from './evolutionFixture'
import { buildReport } from './report'

const TODAY = '2026-12-20'

test('consolida treino, medidas, fotos e dieta no mesmo relatório', () => {
  const report = buildReport(RICH, TODAY)
  expect(report.period).toEqual({ start: '2026-10-05', end: TODAY, days: 77 })
  expect(report.training).toMatchObject({ workouts: 30, perWeek: 2.7, volumeTons: 152.2 })
  expect(report.body?.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'weightKg', first: { date: '2026-10-05', value: 88 }, last: { date: '2026-12-14', value: 83.7 }, delta: -4.3, good: true }),
    expect.objectContaining({ key: 'fat', last: { date: '2026-12-14', value: 22.9 }, delta: -3.3, good: true }),
  ]))
  expect(report.photoPairs.map((pair) => [pair.angle, pair.before.id, pair.after.id])).toEqual([
    ['frente', 'p1', 'p5'],
    ['costas', 'p3', 'p6'],
  ])
  expect(report.diet).toMatchObject({ days: 31, avgGoal: 1896, avgKcal: 592, freeUses: 3, fullDays: 23, waterDays: 20 })
  expect(report.diet?.achievements).toEqual([
    { title: 'Dia no plano', earnedAt: '2026-11-20' },
    { title: '7 dias na dieta', earnedAt: '2026-12-15' },
    { title: 'Água 7 dias', earnedAt: '2026-12-10' },
  ])
})

test.each([
  ['loss', true, '−1 kg', '2026-10-26', 22.9],
  ['gain', false, '+1 kg', undefined, 22.9],
  ['female', false, '+1 kg', undefined, 35.2],
  ['neutral', false, undefined, undefined, 22.9],
  ['noHeight', true, '−1 kg', '2026-10-26', undefined],
] as const)('o perfil %s orienta o progresso de peso e o cálculo de gordura', (key, good, title, earnedAt, fat) => {
  const report = buildReport({ ...RICH, profile: PROFILES[key] }, TODAY)
  const weight = report.body?.rows.find((row) => row.key === 'weightKg')
  const badge = report.achievements.find((achievement) => achievement.id === 'weight-small')
  expect(weight).toMatchObject({ delta: -4.3, good })
  expect(badge?.title).toBe(title)
  expect(badge?.earnedAt).toBe(earnedAt)
  expect(report.body?.rows.find((row) => row.key === 'fat')?.last.value).toBe(fat)
})

test.each([
  [RICH_TODAYS[0], 16, 'falta 23', undefined],
  [RICH_TODAYS[1], 57, 'falta 7', undefined],
  [RICH_TODAYS[2], 77, undefined, '2026-12-16'],
  [RICH_TODAYS[3], 117, undefined, '2026-12-16'],
])('progresso ou data da sequência de 30 treinos em %s', (date, days, progress, earnedAt) => {
  const report = buildReport(RICH, date)
  expect(report.period.days).toBe(days)
  expect(report.achievements.find((achievement) => achievement.id === 'streak-30')).toMatchObject({ progress, earnedAt })
})

test('o relatório continua com só treino ou só dieta', () => {
  const training = buildReport({ ...RICH, dietLog: {}, waterLog: {}, dietPlan: { menus: [] } }, TODAY)
  expect(training.hasDiet).toBe(false)
  expect(training.diet).toBeNull()
  expect(training.achievements.some((achievement) => achievement.diet)).toBe(false)

  const diet = buildReport({ ...RICH, sessions: [], measurements: [], photoSets: [] }, TODAY)
  expect(diet.period.start).toBe('2026-11-20')
  expect(diet.body).toBeNull()
  expect(diet.training.workouts).toBe(0)
  expect(diet.diet?.fullDays).toBe(23)
})

test('água antes da primeira refeição entra no período de dieta', () => {
  const waterLog = { '2026-11-01': { ml: 3000, goalMl: 2500 } }
  const report = buildReport({ ...RICH, waterLog }, TODAY)
  expect(report.diet).toMatchObject({ days: 50, waterDays: 1, fullDays: 23 })
  expect(report.achievements.find((achievement) => achievement.id === 'water-7')?.earnedAt).toBeUndefined()
})
