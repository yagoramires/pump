import type { ExtendedBodyPart, Slug } from 'react-muscle-highlighter'
import type { MuscleLevel } from './summary'

/** músculo do glossário → região do desenho; abdutores (glúteo médio) caem no glúteo, meio das costas no dorso */
const SLUG: Record<string, Slug> = {
  abdominais: 'abs', abdutores: 'gluteal', adutores: 'adductors', bíceps: 'biceps', panturrilhas: 'calves', peito: 'chest',
  antebraços: 'forearm', glúteos: 'gluteal', 'posteriores de coxa': 'hamstring', dorsais: 'upper-back', lombar: 'lower-back',
  'meio das costas': 'upper-back', pescoço: 'neck', quadríceps: 'quadriceps', ombros: 'deltoids', trapézio: 'trapezius', tríceps: 'triceps',
}

export type BodyColors = { primary: string; secondary: string; base: string }

/** cor do modo atual já resolvida: atributo de SVG e canvas não aceitam var(), e getPropertyValue devolve o light-dark() (ou o polyfill do build) sem resolver */
function resolvedColor(name: string, fallback: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(--color-${name})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color.startsWith('rgb') ? color : fallback
}

const translucent = (color: string) => {
  const [r, g, b] = color.match(/[\d.]+/g) ?? []
  return color.startsWith('rgb') ? `rgba(${r}, ${g}, ${b}, 0.35)` : `${color}59`
}

/** o boneco mostra músculo treinado: success-fg (lime no escuro, verde escuro no claro, onde o lime some no fundo) */
export function bodyColors(): BodyColors {
  const primary = resolvedColor('success-fg', '#c6ff3d')
  return { primary, secondary: translucent(primary), base: resolvedColor('border-strong', '#3a3d45') }
}

/** imagem exportada (cartão de compartilhar) não segue o tema do app */
export const EXPORT_BODY_COLORS: BodyColors = { primary: '#c6ff3d', secondary: '#c6ff3d59', base: '#3a3d45' }

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
