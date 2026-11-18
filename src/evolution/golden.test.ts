import { PROFILES, RICH, RICH_TODAYS } from '../../test/evolutionFixture'
import { computeAchievements, type Achievement } from './achievements'
import { buildReport, change, type Report } from './report'

// mesmos dados, mesmas conquistas (ids, títulos, datas, progresso) e mesmos números do relatório que antes da onda W5.
// O snapshot foi gravado com o código antigo; `legacy` só remonta o formato antigo a partir do novo.
const variants = {
  ...Object.fromEntries(Object.entries(PROFILES).map(([k, profile]) => [k, { ...RICH, profile }])),
  noDiet: { ...RICH, dietLog: {}, waterLog: {}, dietPlan: { menus: [] } },
  dietOnly: { ...RICH, workoutLog: {}, measurements: [], photoSets: [] },
  waterOutsideDiet: { ...RICH, waterLog: { '2026-11-01': { ml: 3000, goalMl: 2500 } } },
}

const ach = (l: Achievement[]) => l.map(({ id, title, earnedAt, progress }) => ({ id, title, earnedAt, progress }))
const legacy = (r: Report) => {
  const weight = r.body?.rows.find((x) => x.key === 'weightKg')
  const fat = r.body?.rows.find((x) => x.key === 'fat')
  const { volumeTons, ...training } = r.training
  return {
    period: r.period,
    summary: { weight: weight?.last.value, weightDelta: change(weight), fat: fat?.last.value, fatDelta: change(fat), workouts: training.workouts, volumeTons },
    photoPairs: r.photoPairs,
    body: r.body && { weight: r.body.weight, rows: r.body.rows.map((x) => ({ label: x.label, unit: x.unit, first: x.first.value, last: x.last.value, delta: x.delta, good: x.good })) },
    training,
    diet: r.diet && { ...r.diet, avgKcal: r.diet.avgKcal ?? 0 },
  }
}

for (const [name, input] of Object.entries(variants)) {
  for (const today of RICH_TODAYS) {
    test(`golden ${name} @ ${today}`, () => {
      const report = buildReport(input, today)
      expect(ach(report.achievements)).toEqual(ach(computeAchievements(input, today)))
      expect({ achievements: ach(computeAchievements(input, today)), report: legacy(report) }).toMatchSnapshot()
    })
  }
}
