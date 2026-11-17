export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null
  return Number(t)
}

export function formatKg(n: number): string {
  return String(n).replace('.', ',')
}
