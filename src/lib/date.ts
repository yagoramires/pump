const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const p2 = (n: number) => String(n).padStart(2, '0')

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const weekday = (key: string) => parseDayKey(key).getDay()

// UTC evita que a virada do horário de verão distorça a contagem de dias
export function daysBetween(a: string, b: string): number {
  const utc = (k: string) => {
    const d = parseDayKey(k)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

export function formatDayLabel(key: string): string {
  const d = parseDayKey(key)
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`
}
