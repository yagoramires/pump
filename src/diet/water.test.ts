import { expect, test } from 'vitest'
import { addWater, cupsShown, turnWaterOn, waterMet } from './water'

const s = { enabled: true, goalMl: 2500, cupMl: 250 }

test('turnWaterOn na primeira vez: 35 ml × peso arredondado pra 250; sem peso, 2 L', () => {
  expect(turnWaterOn(undefined, 80)).toEqual({ enabled: true, goalMl: 2750, cupMl: 250 })
  expect(turnWaterOn(undefined, 0).goalMl).toBe(2000)
})

test('cupsShown: com todos cheios aparece um copo a mais', () => {
  expect(cupsShown(2500, s)).toEqual({ full: 10, total: 11 })
  expect(cupsShown(500, s)).toEqual({ full: 2, total: 10 })
})

test('addWater grava a meta do dia e tirar não passa de 0', () => {
  const log = addWater({}, '2026-11-18', s, 1)
  expect(log['2026-11-18']).toEqual({ ml: 250, goalMl: 2500 })
  expect(addWater(log, '2026-11-18', s, -1)['2026-11-18'].ml).toBe(0)
  expect(addWater({}, '2026-11-18', s, -1)['2026-11-18'].ml).toBe(0)
})

test('waterMet: ml ≥ goalMl > 0', () => {
  expect(waterMet({ ml: 2500, goalMl: 2500 })).toBe(true)
  expect(waterMet({ ml: 100, goalMl: 2500 })).toBe(false)
  expect(waterMet({ ml: 0, goalMl: 0 })).toBe(false)
  expect(waterMet(undefined)).toBe(false)
})

test('turnWaterOn: religa o que estava salvo; na primeira vez usa a meta do peso', () => {
  expect(turnWaterOn({ enabled: false, goalMl: 3000, cupMl: 300 }, 80)).toEqual({ enabled: true, goalMl: 3000, cupMl: 300 })
})
