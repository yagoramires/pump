export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null
  return Number(t)
}

export function formatKg(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export const formatDec = (n: number, min = 0): string => n.toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: 1 })
