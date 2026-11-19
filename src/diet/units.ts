const AO: Record<string, string> = { pão: 'pães', mão: 'mãos', cão: 'cães', alemão: 'alemães' }
const recase = (src: string, out: string) =>
  src.length > 1 && src === src.toUpperCase() ? out.toUpperCase() : src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out
const L_END: Record<string, string> = { al: 'ais', el: 'éis', ol: 'óis', ul: 'uis', il: 'is' }
/** plural pt-BR de um substantivo simples: vogal +s, r/z +es, -l → -is (papel → papéis), m → ns, ão → ões (com exceções); já no plural (termina em s) fica */
export const pluralWord = (w: string) => {
  const l = w.toLowerCase()
  const out = AO[l] ?? (/s$/.test(l) ? l : /[rz]$/.test(l) ? `${l}es` : /[aeiou]l$/.test(l) ? l.slice(0, -2) + L_END[l.slice(-2)] : /m$/.test(l) ? `${l.slice(0, -1)}ns` : /ão$/.test(l) ? `${l.slice(0, -2)}ões` : `${l}s`)
  return recase(w, out)
}
const SINGULAR_AO = Object.fromEntries(Object.entries(AO).map(([a, b]) => [b, a]))
const SING_L: Record<string, string> = { ais: 'al', éis: 'el', óis: 'ol', uis: 'ul' }
/** inverso de pluralWord (minúsculo); o que já está no singular fica */
export const singularWord = (w: string) => {
  const l = w.toLowerCase()
  if (SINGULAR_AO[l]) return SINGULAR_AO[l]
  if (/ões$/.test(l)) return `${l.slice(0, -3)}ão`
  if (SING_L[l.slice(-3)]) return l.slice(0, -3) + SING_L[l.slice(-3)]
  if (/[^aeiouáéíóú]is$/.test(l)) return `${l.slice(0, -1)}l`
  if (/ns$/.test(l)) return `${l.slice(0, -2)}m`
  if (/[rz]es$/.test(l)) return l.slice(0, -2)
  return /s$/.test(l) ? l.slice(0, -1) : l
}
