export const namesText = (names: string[]) => names.slice(0, 5).join(', ') + (names.length > 5 ? ` e mais ${names.length - 5}` : '')

export const normalize = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** texto aparado; o que não for string (backup antigo, JSON da IA) vira '' */
export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
