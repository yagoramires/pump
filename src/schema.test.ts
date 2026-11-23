import { VALID } from './schema'

test('settings aceita os três temas e backup antigo sem tema', () => {
  const base = { lastTab: 'treino', onboardingDone: true }
  expect(VALID.settings(base)).toBe(true)
  for (const theme of ['dark', 'light', 'system']) expect(VALID.settings({ ...base, theme })).toBe(true)
  expect(VALID.settings({ ...base, theme: 'azul' })).toBe(false)
})
