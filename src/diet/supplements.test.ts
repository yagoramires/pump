import { expect, test } from 'vitest'
import { VALID } from '@/schema'
import { supplementSub, syncToday, toggleSupplement } from './supplements'

const D = '2026-11-20'
const ONTEM = '2026-11-19'
const a = { id: 'a', name: 'Creatina' }
const c = { id: 'c', name: 'Ômega 3' }

test('toggleSupplement marca, grava o total e desmarcar o último remove o dia', () => {
  const log = toggleSupplement({}, D, 'a', 3)
  expect(log).toEqual({ [D]: { taken: ['a'], total: 3 } })
  expect(toggleSupplement(log, D, 'a', 3)).toEqual({})
})

test('syncToday tira ids removidos e atualiza o total só de hoje', () => {
  const log = { [ONTEM]: { taken: ['a', 'b'], total: 3 }, [D]: { taken: ['a', 'b'], total: 3 } }
  expect(syncToday(log, D, [a, c])).toEqual({ [ONTEM]: { taken: ['a', 'b'], total: 3 }, [D]: { taken: ['a'], total: 2 } })
})

test('syncToday remove o dia quando nada marcado sobra', () => {
  expect(syncToday({ [D]: { taken: ['b'], total: 2 } }, D, [a])).toEqual({})
})

test('syncToday sem entrada hoje devolve o mesmo log', () => {
  const log = { [ONTEM]: { taken: ['a'], total: 1 } }
  expect(syncToday(log, D, [a])).toBe(log)
})

test('supplementSub junta só o preenchido', () => {
  expect(supplementSub({ ...a, dose: '5 g' })).toBe('5 g')
  expect(supplementSub({ ...a, dose: '5 g', when: 'almoço' })).toBe('5 g · almoço')
  expect(supplementSub(a)).toBe('')
})

test('VALID.supplementLog recusa formato errado', () => {
  expect(VALID.supplementLog({ [D]: { taken: ['a'], total: 2 } })).toBe(true)
  expect(VALID.supplementLog({ x: { taken: 'a', total: 1 } })).toBe(false)
})

test('VALID.settings recusa supplements malformado (senão a aba Dieta quebra ao abrir)', () => {
  const base = { lastTab: 'dieta', onboardingDone: true }
  expect(VALID.settings(base)).toBe(true)
  expect(VALID.settings({ ...base, supplements: [{ id: 'a', name: 'Creatina' }] })).toBe(true)
  expect(VALID.settings({ ...base, supplements: {} })).toBe(false)
  expect(VALID.settings({ ...base, supplements: [{ id: 'a' }] })).toBe(false)
})
