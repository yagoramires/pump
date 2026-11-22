import { bodyParts } from './bodyParts'

test('mapeia os músculos nas regiões do desenho; principal vence quando dois caem na mesma região', () => {
  const c = { primary: 'P', secondary: 'S', base: 'B' }
  const parts = bodyParts(new Map([['abdutores', 'secondary'], ['glúteos', 'primary'], ['lombar', 'secondary'], ['quadríceps', 'primary']] as const), c)
  expect(parts).toEqual([
    { slug: 'head', color: 'B' }, { slug: 'hair', color: 'B' },
    { slug: 'gluteal', color: 'P' }, { slug: 'lower-back', color: 'S' }, { slug: 'quadriceps', color: 'P' },
  ])
})
