import type { ExtendedBodyPart, Slug } from 'react-muscle-highlighter'
import type { MuscleLevel } from './summary'

/** músculo do glossário → região do desenho; abdutores (glúteo médio) caem no glúteo, meio das costas no dorso */
const SLUG: Record<string, Slug> = {
  abdominais: 'abs', abdutores: 'gluteal', adutores: 'adductors', bíceps: 'biceps', panturrilhas: 'calves', peito: 'chest',
  antebraços: 'forearm', glúteos: 'gluteal', 'posteriores de coxa': 'hamstring', dorsais: 'upper-back', lombar: 'lower-back',
  'meio das costas': 'upper-back', pescoço: 'neck', quadríceps: 'quadriceps', ombros: 'deltoids', trapézio: 'trapezius', tríceps: 'triceps',
}

export type BodyColors = { primary: string; secondary: string; base: string }

/** as variáveis CSS não valem dentro dos atributos do SVG nem no canvas: lê as cores do tema já resolvidas */
export function bodyColors(): BodyColors {
  const css = getComputedStyle(document.documentElement)
  const color = (n: string, fallback: string) => css.getPropertyValue(`--color-${n}`).trim() || fallback
  const accent = color('accent', '#c6ff3d')
  return { primary: accent, secondary: `${accent}59`, base: color('border-strong', '#3a3d45') }
}

export function bodyParts(levels: Map<string, MuscleLevel>, c: BodyColors): ExtendedBodyPart[] {
  const bySlug = new Map<Slug, MuscleLevel>()
  for (const [m, l] of levels) {
    const slug = SLUG[m]
    if (slug && bySlug.get(slug) !== 'primary') bySlug.set(slug, l)
  }
  return [
    { slug: 'head', color: c.base }, { slug: 'hair', color: c.base },
    ...[...bySlug].map(([slug, l]) => ({ slug, color: l === 'primary' ? c.primary : c.secondary })),
  ]
}
