import glossary from '../../data/glossary.pt.json' with { type: 'json' }
import { MUSCLE_GROUPS, muscleColor } from './muscles'

test('a tabela tem todos os músculos do glossário, na ordem dele', () => {
  expect([...MUSCLE_GROUPS.keys()]).toEqual(Object.values(glossary.muscles))
})
test('muscleColor usa o primeiro músculo com grupo; sem grupo cai na cor padrão', () => {
  expect(muscleColor(['pescoço', 'peito'])).toBe(muscleColor(['peito']))
  expect(muscleColor(['constructor'])).toBe(muscleColor([]))
})
