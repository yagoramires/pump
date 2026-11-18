export const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
export const WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
/** seg..dom, como `getDay()` */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const p2 = (n: number) => String(n).padStart(2, '0')

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const weekday = (key: string) => parseDayKey(key).getDay()

export const hhmm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + n)
  return todayKey(d)
}

export function eachDay(from: string, toExclusive: string): string[] {
  const out: string[] = []
  for (let k = from; k < toExclusive; k = addDays(k, 1)) out.push(k)
  return out
}

export function weekStart(key: string): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() - d.getDay())
  return todayKey(d)
}

export function countInWeekBefore<T>(log: Record<string, T>, date: string, count: (v: T) => number): number {
  const from = weekStart(date)
  let n = 0
  for (const [k, v] of Object.entries(log)) if (k >= from && k < date) n += count(v)
  return n
}

// UTC evita que a virada do horário de verão distorça a contagem de dias
export function daysBetween(a: string, b: string): number {
  const utc = (k: string) => {
    const d = parseDayKey(k)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

export const weeksBetween = (a: string, b: string): number => Math.max(1, Math.round(daysBetween(a, b) / 7))

export function formatDayLabel(key: string): string {
  const d = parseDayKey(key)
  return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`
}

/** '16 nov' */
export function formatDayMonth(key: string): string {
  const d = parseDayKey(key)
  return `${d.getDate()} ${MESES[d.getMonth()].toLowerCase()}`
}
