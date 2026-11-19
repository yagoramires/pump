import type { Focus, Profile } from './types'

/** o formulário já abre com hipertrofia marcada: quem nunca salvou tem esse foco */
export const focusOf = (p?: Profile): Focus => p?.focus ?? 'hipertrofia'

export const profileDraft = (p: Profile): Profile => ({ ...p, focus: focusOf(p) })

/** o perfil começa com altura 0 (DEFAULTS); sem altura, o sexo é só o valor padrão */
export const hasProfile = (p: Profile) => p.heightCm > 0
