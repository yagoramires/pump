import { beep, remainingSec, unlockAudio } from './restTimer'

test('restante vem do relógio, não de ticks', () => {
  const end = 1_000_000 + 90_000
  expect(remainingSec(end, 1_000_000)).toBe(90)
  expect(remainingSec(end, 1_000_000 + 89_100)).toBe(1)
  expect(remainingSec(end, 1_000_000 + 600_000)).toBe(0)
})
test('áudio não quebra sem AudioContext', () => {
  expect(() => { unlockAudio(); beep() }).not.toThrow()
})
