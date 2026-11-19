import { beep, unlockAudio } from './restTimer'
import { restRemainingSeconds } from './session'

test('restante vem do relógio, não de ticks', () => {
  const timer = { paused: false, endAt: 1_000_000 + 90_000 } as const
  expect(restRemainingSeconds(timer, 1_000_000)).toBe(90)
  expect(restRemainingSeconds(timer, 1_000_000 + 89_100)).toBe(1)
  expect(restRemainingSeconds(timer, 1_000_000 + 600_000)).toBe(0)
})
test('áudio não quebra sem AudioContext', () => {
  expect(() => { unlockAudio(); beep() }).not.toThrow()
})
