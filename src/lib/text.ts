// até 5 nomes, o resto vira "e mais N"
export const namesText = (names: string[]) => names.slice(0, 5).join(', ') + (names.length > 5 ? ` e mais ${names.length - 5}` : '')

/** plural pt-BR de um substantivo simples: vogal +s, r/z +es, l → is, m → ns, ão → ões; já no plural (termina em s) fica */
export const pluralWord = (w: string) =>
  /s$/i.test(w) ? w : /[rz]$/i.test(w) ? `${w}es` : /l$/i.test(w) ? `${w.slice(0, -1)}is` : /m$/i.test(w) ? `${w.slice(0, -1)}ns` : /ão$/i.test(w) ? `${w.slice(0, -2)}ões` : `${w}s`
