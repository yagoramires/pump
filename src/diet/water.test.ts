import { expect, test } from 'vitest'
import { setWater, turnWaterOn, waterMax, waterMet } from './water'

const s = { enabled: true, goalMl: 2500 }

test('turnWaterOn na primeira vez: 35 ml × peso arredondado pra 250; sem peso, 2 L', () => {
  expect(turnWaterOn(undefined, 80)).toEqual({ enabled: true, goalMl: 2750 })
  expect(turnWaterOn(undefined, 0).goalMl).toBe(2000)
})

test('setWater grava o total e nunca negativo', () => {
  expect(setWater({}, '2026-11-21', s, 1300)).toEqual({ '2026-11-21': { ml: 1300, goalMl: 2500 } })
  expect(setWater({}, '2026-11-21', s, -100)['2026-11-21'].ml).toBe(0)
})

test('waterMax: meta até bater; depois ml + 500', () => {
  expect(waterMax(1200, 2500)).toBe(2500)
  expect(waterMax(2500, 2500)).toBe(3000)
  expect(waterMax(2700, 2500)).toBe(3200)
})

test('waterMet: ml ≥ goalMl > 0', () => {
  expect(waterMet({ ml: 2500, goalMl: 2500 })).toBe(true)
  expect(waterMet({ ml: 100, goalMl: 2500 })).toBe(false)
  expect(waterMet({ ml: 0, goalMl: 0 })).toBe(false)
  expect(waterMet(undefined)).toBe(false)
})

test('turnWaterOn: religa o que estava salvo sem recalcular pelo peso', () => {
  expect(turnWaterOn({ enabled: false, goalMl: 3000 }, 80)).toEqual({ enabled: true, goalMl: 3000 })
})
