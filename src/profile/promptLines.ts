import { SEX_LABEL, type Profile } from './types'
import { hasProfile } from './profile'
import { isKeyOf } from '@/lib/utils'

export const label = <T extends string>(labels: Record<T, string>, v: unknown): string => (isKeyOf(labels, v) ? labels[v] : '')
export const names = <T extends string>(v: unknown, labels: Record<T, string>) =>
  Array.isArray(v) ? v.map((x) => label(labels, x)).filter(Boolean).join(', ') : ''

export function profileLines(p?: Profile): string[] {
  const filled = !!p && hasProfile(p)
  return [
    filled ? `Sexo: ${SEX_LABEL[p.sex === 'F' ? 'F' : 'M'].toLowerCase()}` : '',
    p?.age ? `Idade: ${p.age} anos` : '',
    filled ? `Altura: ${p.heightCm} cm` : '',
    p?.daysPerWeek ? `Dias de treino por semana: ${p.daysPerWeek}` : '',
  ].filter(Boolean).map((l) => `- ${l}`)
}
