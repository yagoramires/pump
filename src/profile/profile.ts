import type { Profile } from './types'

export const profileDraft = (p: Profile): Profile => ({ focus: 'hipertrofia', ...p })

/** o perfil começa com altura 0 (DEFAULTS); sem altura, o sexo é só o valor padrão */
export const hasProfile = (p: Profile) => p.heightCm > 0
