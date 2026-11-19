export const namesText = (names: string[]) => names.slice(0, 5).join(', ') + (names.length > 5 ? ` e mais ${names.length - 5}` : '')

export const normalize = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
