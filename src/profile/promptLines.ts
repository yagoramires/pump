import { FOCUS_LABEL, SEX_LABEL, type Focus, type Profile } from './types'
import { hasProfile } from './profile'

// Backups antigos podem trazer respostas que não existem nas opções atuais.
export const label = <T extends string>(labels: Record<T, string>, v: unknown): string =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(labels, v) ? labels[v as T] : ''
export const names = <T extends string>(v: unknown, labels: Record<T, string>) =>
  Array.isArray(v) ? v.map((x) => label(labels, x)).filter(Boolean).join(', ') : ''

export const FOCUS: Record<Focus, string> = {
  hipertrofia: `${FOCUS_LABEL.hipertrofia.toLowerCase()} (ganhar massa muscular)`,
  forca: FOCUS_LABEL.forca.toLowerCase(),
  condicionamento: FOCUS_LABEL.condicionamento.toLowerCase(),
}

export function profileLines(p?: Profile): string[] {
  const filled = !!p && hasProfile(p)
  return [
    filled ? `Sexo: ${SEX_LABEL[p.sex === 'F' ? 'F' : 'M'].toLowerCase()}` : '',
    p?.age ? `Idade: ${p.age} anos` : '',
    filled ? `Altura: ${p.heightCm} cm` : '',
  ].filter(Boolean).map((l) => `- ${l}`)
}
