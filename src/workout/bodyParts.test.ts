import { bodyColors, bodyParts } from './bodyParts'

test('mapeia os músculos nas regiões do desenho; principal vence quando dois caem na mesma região', () => {
  const c = { primary: 'P', secondary: 'S', base: 'B' }
  const parts = bodyParts(new Map([['abdutores', 'secondary'], ['glúteos', 'primary'], ['lombar', 'secondary'], ['quadríceps', 'primary']] as const), c)
  expect(parts).toEqual([
    { slug: 'head', color: 'B' }, { slug: 'hair', color: 'B' },
    { slug: 'gluteal', color: 'P' }, { slug: 'lower-back', color: 'S' }, { slug: 'quadriceps', color: 'P' },
  ])
})

test('cores do boneco: rgb resolvido vira rgba translúcido; sem resolver, cai no hex padrão', () => {
  const real = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => ({ ...real(el), color: (el as HTMLElement).style.color.includes('success') ? 'rgb(63, 125, 0)' : 'rgb(207, 212, 219)' }) as CSSStyleDeclaration)
  expect(bodyColors()).toEqual({ primary: 'rgb(63, 125, 0)', secondary: 'rgba(63, 125, 0, 0.35)', base: 'rgb(207, 212, 219)' })
  vi.restoreAllMocks()
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => ({ ...real(el), color: '' }) as CSSStyleDeclaration)
  expect(bodyColors()).toEqual({ primary: '#c6ff3d', secondary: '#c6ff3d59', base: '#3a3d45' })
  vi.restoreAllMocks()
})
