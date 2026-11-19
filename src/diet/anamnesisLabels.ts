import type { DietAnamnesis, Restriction } from './types'

export const RESTRICTIONS: Record<Restriction, string> = { lactose: 'Sem lactose', gluten: 'Sem glúten', vegetariano: 'Vegetariano', vegano: 'Vegano' }

type EatOut = NonNullable<DietAnamnesis['eatOut']>
export const EAT_OUT_FORM: Record<EatOut, string> = { casa: 'Em casa', fora: 'Fora', misto: 'Misto' }
export const EAT_OUT_PROMPT: Record<EatOut, string> = {
  casa: EAT_OUT_FORM.casa.toLowerCase(),
  fora: `${EAT_OUT_FORM.fora.toLowerCase()} de casa`,
  misto: `${EAT_OUT_FORM.misto.toLowerCase()} (em casa e fora)`,
}
