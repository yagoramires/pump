import glossary from '../../data/glossary.pt.json' with { type: 'json' }
import { MUSCLE_GROUPS, muscleColor } from './muscles'

test('a tabela tem todos os músculos do glossário, na ordem dele', () => {
  expect([...MUSCLE_GROUPS.keys()]).toEqual(Object.values(glossary.muscles))
})
test('muscleColor pelo primeiro músculo com grupo', () => {
  expect(muscleColor(['peito', 'tríceps'])).toBe('var(--c2)')
  expect(muscleColor(['dorsais'])).toBe('var(--c6)')
  expect(muscleColor(['quadríceps'])).toBe('var(--c1)')
  expect(muscleColor(['pescoço', 'peito'])).toBe('var(--c2)')
  expect(muscleColor(['constructor'])).toBe('var(--c5)')
  expect(muscleColor([])).toBe('var(--c5)')
})
