import { SEX_LABEL, type Profile } from './types'
import { hasProfile } from './profile'

export function profileLines(p?: Profile): string[] {
  const filled = !!p && hasProfile(p)
  return [
    filled ? `Sexo: ${SEX_LABEL[p.sex === 'F' ? 'F' : 'M'].toLowerCase()}` : '',
    p?.age ? `Idade: ${p.age} anos` : '',
    filled ? `Altura: ${p.heightCm} cm` : '',
    p?.daysPerWeek ? `Dias de treino por semana: ${p.daysPerWeek}` : '',
  ].filter(Boolean).map((l) => `- ${l}`)
}
