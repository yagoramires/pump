import type { Profile } from './types'
import type { Focus } from './types'
import { hasProfile } from './profile'

// backup importado não valida as anamneses: só valores conhecidos entram no prompt, nunca "undefined"
export const label = <T extends string>(labels: Record<T, string>, v: unknown): string => (typeof v === 'string' && labels[v as T]) || ''
export const names = <T extends string>(v: unknown, labels: Record<T, string>) =>
  Array.isArray(v) ? v.map((x) => labels[x as T]).filter(Boolean).join(', ') : ''

export const FOCUS: Record<Focus, string> = { hipertrofia: 'hipertrofia (ganhar massa muscular)', forca: 'força', condicionamento: 'condicionamento' }

export function profileLines(p?: Profile): string[] {
  const filled = !!p && hasProfile(p)
  return [
    filled ? `Sexo: ${p.sex === 'F' ? 'feminino' : 'masculino'}` : '',
    p?.age ? `Idade: ${p.age} anos` : '',
    filled ? `Altura: ${p.heightCm} cm` : '',
  ].filter(Boolean).map((l) => `- ${l}`)
}
