import type { Profile } from './types'
import type { Goal } from '@/workout/types'
import { formatKg } from '@/lib/number'
import { hasProfile } from './profile'

// backup importado não valida as anamneses: só valores conhecidos entram no prompt, nunca "undefined"
export const label = <T extends string>(labels: Record<T, string>, v: unknown): string => (typeof v === 'string' && labels[v as T]) || ''
export const names = <T extends string>(v: unknown, labels: Record<T, string>) =>
  Array.isArray(v) ? v.map((x) => labels[x as T]).filter(Boolean).join(', ') : ''

export const GOALS: Record<Goal, string> = { hipertrofia: 'ganhar massa muscular', emagrecer: 'emagrecer', forca: 'ganhar força', saude: 'saúde e condicionamento' }

export function profileLines(p?: Profile): string[] {
  const filled = !!p && hasProfile(p)
  return [
    filled ? `Sexo: ${p.sex === 'F' ? 'feminino' : 'masculino'}` : '',
    p?.anamnesis?.age ? `Idade: ${p.anamnesis.age} anos` : '',
    filled ? `Altura: ${p.heightCm} cm` : '',
    p?.weightKg ? `Peso: ${formatKg(p.weightKg)} kg` : '',
  ].filter(Boolean).map((l) => `- ${l}`)
}
