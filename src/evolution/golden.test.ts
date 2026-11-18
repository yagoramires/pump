import { PROFILES, RICH, RICH_TODAYS } from '../../test/evolutionFixture'
import { computeAchievements } from './achievements'
import { buildReport } from './report'

// mesmos dados, mesmas conquistas (ids, títulos, datas, progresso) e mesmo relatório que antes da onda W5
const variants = {
  ...Object.fromEntries(Object.entries(PROFILES).map(([k, profile]) => [k, { ...RICH, profile }])),
  noDiet: { ...RICH, dietLog: {}, waterLog: {}, dietPlan: { menus: [] } },
  dietOnly: { ...RICH, workoutLog: {}, measurements: [], photoSets: [] },
  waterOutsideDiet: { ...RICH, waterLog: { '2026-11-01': { ml: 3000, goalMl: 2500 } } },
}

for (const [name, input] of Object.entries(variants)) {
  for (const today of RICH_TODAYS) {
    test(`golden ${name} @ ${today}`, () => {
      expect({ achievements: computeAchievements(input, today), report: buildReport(input, today) }).toMatchSnapshot()
    })
  }
}
