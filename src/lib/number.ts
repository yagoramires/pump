export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null
  return Number(t)
}

export function formatKg(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export const formatDec = (n: number, min = 0): string => n.toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: 1 })

export const round1 = (n: number) => Math.round(n * 10) / 10

/** diferença com sinal; o PDF passa '–' porque a Helvetica (WinAnsi) não tem '−' */
export const formatSigned = (n: number, minus = '−') => `${n < 0 ? minus : n > 0 ? '+' : ''}${formatDec(Math.abs(n))}`

/** valor salvo de volta no campo: sem milhar, senão "1.240" voltaria como 1,24 */
export const formatInput = (n: number) => String(n).replace('.', ',')

export function parseInRange(s: string, min: number, max: number): number | null {
  const n = parseDecimal(s)
  return n !== null && n >= min && n <= max ? n : null
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

