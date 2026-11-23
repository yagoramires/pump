import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { formatDayLabel, p2, parseDayKey } from '@/lib/date'
import { formatKg, plural } from '@/lib/number'
import { EXPORT_BODY_COLORS } from './bodyParts'
import type { Highlight, MuscleLevel } from './summary'

export type CardInput = {
  label: string; name: string; date: string; minutes: number | null; sets: number; exercises: number
  highlight: Highlight; week?: { days: number; goal: number }; levels: Map<string, MuscleLevel>
}
/** card: placar com fundo escuro; stories: adesivo compacto no rodapé, sem fundo, pra colar sobre uma foto */
export type CardFormat = 'card' | 'stories'
export type CardOptions = { format: CardFormat; loads: boolean; date: boolean; week: boolean; map: boolean }
export const CARD_DEFAULTS: CardOptions = { format: 'card', loads: false, date: false, week: true, map: true }

export type CardRow = { big: string; label: string; lime?: boolean }

const dayMonth = (key: string) => { const d = parseDayKey(key); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}` }

/** a linha verde do placar; sem `loads`, nada que revele carga */
function highlightRow(h: Highlight, loads: boolean): CardRow | undefined {
  const row = (big: string, label: string) => ({ big, label, lime: true })
  switch (h.kind) {
    case 'first': return row('1º', 'treino no Pump')
    case 'goal': return row(`${h.goal}/${h.goal}`, 'meta da semana batida')
    case 'neutral': return undefined
    case 'record': {
      const m = h.mark
      if (m.kind === 'reps') return row(`+${m.reps - m.prevReps}`, loads ? `reps no ${h.name}, recorde com ${formatKg(m.kg)} kg` : `reps no ${h.name}, recorde pessoal`)
      return loads ? row(`+${formatKg(m.kg - m.prevKg)}`, `kg no ${h.name}, recorde de carga`) : row('PR', `recorde de carga no ${h.name}`)
    }
    case 'improved': {
      const m = h.mark
      const since = `desde ${dayMonth(m.date)}`
      if (m.kind === 'reps') return row(`+${m.reps - m.prevReps}`, loads ? `reps no ${h.name} com ${formatKg(m.kg)} kg, ${since}` : `reps no ${h.name} ${since}`)
      return loads ? row(`+${formatKg(m.kg - m.prevKg)}`, `kg no ${h.name} ${since}`) : row('↑', `subiu a carga no ${h.name}`)
    }
  }
}

/** o placar: duração, séries e o destaque em verde */
export function cardRows(input: CardInput, opts: CardOptions): CardRow[] {
  const rows: CardRow[] = []
  const m = input.minutes
  if (m !== null) rows.push(m < 60 ? { big: String(m), label: 'minutos de treino' } : { big: `${Math.floor(m / 60)}h${p2(m % 60)}`, label: 'de treino' })
  rows.push({ big: String(input.sets), label: `${input.sets === 1 ? 'série' : 'séries'} em ${plural(input.exercises, 'exercício', 'exercícios')}` })
  const h = highlightRow(input.highlight, opts.loads)
  if (h) rows.push(h)
  return rows
}

/** rodapé: nome do treino, semana e data */
export function cardFoot(input: CardInput, opts: CardOptions) {
  return {
    title: input.label === 'Extra' ? [input.name] : [`Treino ${input.label}`, input.name],
    week: opts.week && input.week ? `${input.week.days} de ${input.week.goal} treinos na semana` : undefined,
    date: opts.date ? formatDayLabel(input.date).toLowerCase() : undefined,
  }
}

const compactDuration = (m: number) => (m < 60 ? `${m}min` : `${Math.floor(m / 60)}h${p2(m % 60)}`)

/** o adesivo do Stories: nome, destaque numa frase e os números em colunas */
export function stickerText(input: CardInput, opts: CardOptions) {
  const h = highlightRow(input.highlight, opts.loads)
  const stats: [string, string][] = []
  if (input.minutes !== null) stats.push([compactDuration(input.minutes), 'duração'])
  stats.push([String(input.sets), input.sets === 1 ? 'série' : 'séries'])
  if (opts.week && input.week) stats.push([`${input.week.days}/${input.week.goal}`, 'na semana'])
  return {
    eyebrow: input.label === 'Extra' ? undefined : `Treino ${input.label}`,
    name: input.name,
    highlight: h && `${h.big} ${h.label}`,
    stats,
    date: opts.date ? formatDayLabel(input.date).toLowerCase() : undefined,
  }
}

const W = 1080, H = 1920, PAD = 90
const FONT = '-apple-system, "SF Pro Display", Inter, sans-serif'

/** a mesma figura do resumo, renderizada fora da tela e virada imagem (SVG com as cores já resolvidas) */
async function bodyImages(levels: CardInput['levels'], light: boolean): Promise<HTMLImageElement[]> {
  await Promise.resolve() // flushSync não pode rodar dentro do efeito que chamou o renderCard
  const { BodyFigures } = await import('./BodyMap')
  const div = document.createElement('div')
  const root = createRoot(div)
  flushSync(() => root.render(createElement(BodyFigures, { levels, colors: light ? { ...EXPORT_BODY_COLORS, base: '#ffffff59' } : EXPORT_BODY_COLORS, scale: 2 })))
  const svgs = [...div.querySelectorAll('svg')].map((svg) => { svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); return svg.outerHTML })
  root.unmount()
  return Promise.all(svgs.map((src) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`
  })))
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) { lines.push(line); line = word } else line = next
  }
  return line ? [...lines, line] : lines
}

type Palette = { bg: string; line: string; strong: string; text: string; text2: string; accent: string }
type Font = (size: number, weight: number, spacing?: number) => void

/** PNG 1080×1920 (placar ou adesivo do Stories); as cores vêm das variáveis CSS do app (o canvas não lê var()) */
export async function renderCard(input: CardInput, opts: CardOptions): Promise<Blob> {
  const css = getComputedStyle(document.documentElement)
  const color = (n: string, fallback: string) => css.getPropertyValue(`--color-${n}`).trim() || fallback
  const c: Palette = {
    bg: color('bg', '#0b0c0d'), line: color('line', '#222428'), strong: color('strong', '#fff'), text: color('text', '#d6d8dd'), text2: color('text-2', '#8a8d96'), accent: color('accent', '#c6ff3d'),
  }
  const stories = opts.format === 'stories'
  const figures = opts.map && input.levels.size ? await bodyImages(input.levels, stories) : []
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponível')
  const font: Font = (size, weight, spacing = 0) => {
    ctx.font = `${weight} ${size}px ${FONT}`
    // letterSpacing é recente no canvas: onde não existe, o texto só fica um pouco mais largo
    ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${spacing}px`
  }
  ctx.textBaseline = 'alphabetic'
  if (stories) drawSticker(ctx, font, c, input, opts, figures)
  else drawScoreboard(ctx, font, c, input, opts, figures)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png vazio'))), 'image/png'))
}

function drawScoreboard(ctx: CanvasRenderingContext2D, font: Font, c: Palette, input: CardInput, opts: CardOptions, figures: HTMLImageElement[]) {
  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, W, H)
  font(56, 900, -1)
  ctx.fillStyle = c.accent
  ctx.fillText('pump', PAD, 170)
  const foot = cardFoot(input, opts)
  if (foot.date) {
    font(36, 500)
    ctx.fillStyle = c.text2
    ctx.textAlign = 'right'
    ctx.fillText(foot.date, W - PAD, 170)
    ctx.textAlign = 'left'
  }

  // tamanho do número de cada linha (encolhe o que não cabe)
  const sized = cardRows(input, opts).map((row) => {
    let size = 230
    font(size, 900, -10)
    while (ctx.measureText(row.big).width > W - 2 * PAD - 300 && size > 140) font((size -= 10), 900, -size / 25)
    return { row, size, width: ctx.measureText(row.big).width }
  })
  let y = 250
  for (const { row, size, width } of sized) {
    // rótulo numa coluna comum; número largo (1h44) empurra só o da própria linha
    const col = Math.max(PAD + 400, PAD + width + 44)
    font(size, 900, -size / 23)
    const base = y + size * 0.8
    ctx.fillStyle = row.lime ? c.accent : c.strong
    ctx.fillText(row.big, PAD, base)
    font(46, 500)
    const lines = wrap(ctx, row.label, W - PAD - col)
    ctx.fillStyle = row.lime ? c.text : c.text2
    // a última linha do rótulo fica na linha de base do número
    lines.forEach((l, i) => ctx.fillText(l, col, base - (lines.length - 1 - i) * 58))
    y = base + 56
    ctx.fillStyle = c.line
    ctx.fillRect(PAD, y, W - 2 * PAD, 3)
    y += 66
  }

  // rodapé de baixo pra cima
  const bottom = H - PAD
  const bodyH = figures.length ? Math.min(600, bottom - y) : 0
  const bodyW = bodyH / 2
  figures.forEach((img, i) => ctx.drawImage(img, PAD - bodyW * 0.08 + i * bodyW * 0.72, bottom - bodyH, bodyW, bodyH))
  const mx = figures.length ? PAD + bodyW * 1.72 + 36 : PAD
  let my = bottom - 24
  if (foot.week && input.week) {
    font(34, 500)
    ctx.fillStyle = c.text2
    const weekLines = wrap(ctx, foot.week, W - PAD - mx)
    weekLines.reverse().forEach((l, i) => ctx.fillText(l, mx, my - i * 44))
    my -= 62 + (weekLines.length - 1) * 44
    bar(ctx, c, mx, my, W - PAD - mx, input.week.days / input.week.goal, c.line)
    my -= 52
  }
  font(72, 800, -2)
  ctx.fillStyle = c.strong
  foot.title.flatMap((t) => wrap(ctx, t, W - PAD - mx)).reverse().forEach((l, i) => ctx.fillText(l, mx, my - i * 78))
}

function bar(ctx: CanvasRenderingContext2D, c: Palette, x: number, y: number, w: number, pct: number, track: string) {
  ctx.fillStyle = track
  ctx.beginPath()
  ctx.roundRect(x, y, w, 16, 8)
  ctx.fill()
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.roundRect(x, y, w * Math.min(1, pct), 16, 8)
  ctx.fill()
}

const SIDE = 80, BOTTOM = 130

/** sem fundo: tudo no terço de baixo, com sombra pra ler sobre qualquer foto */
function drawSticker(ctx: CanvasRenderingContext2D, font: Font, c: Palette, input: CardInput, opts: CardOptions, figures: HTMLImageElement[]) {
  const t = stickerText(input, opts)
  const bottom = H - BOTTOM
  const bodyH = figures.length ? 440 : 0
  const bodyW = bodyH / 2
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 18
  figures.forEach((img, i) => ctx.drawImage(img, SIDE - bodyW * 0.08 + i * bodyW * 0.72, bottom - bodyH, bodyW, bodyH))
  ctx.restore()

  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 28
  ctx.shadowOffsetY = 4
  const x = figures.length ? SIDE + bodyW * 1.72 + 40 : SIDE
  const w = W - SIDE - x
  let y = bottom

  font(46, 900, -1)
  ctx.fillStyle = c.accent
  ctx.fillText('pump', x, y)
  y -= 92

  // cada coluna tem a largura do que contém, mais um respiro
  let sx = x
  for (const [big, label] of t.stats) {
    font(30, 500)
    const lw = ctx.measureText(label).width
    ctx.fillStyle = c.text
    ctx.fillText(label, sx, y)
    font(64, 800, -2)
    const bw = ctx.measureText(big).width
    ctx.fillStyle = c.strong
    ctx.fillText(big, sx, y - 42)
    sx += Math.max(lw, bw) + 48
  }
  y -= 42 + 64 + 40

  if (t.highlight) {
    font(42, 700)
    ctx.fillStyle = c.accent
    wrap(ctx, t.highlight, w).reverse().forEach((l) => { ctx.fillText(l, x, y); y -= 52 })
    y -= 22
  }

  let size = 150
  font(size, 900, -6)
  while (ctx.measureText(t.name).width > w && size > 80) font((size -= 8), 900, -size / 25)
  ctx.fillStyle = c.strong
  ctx.fillText(t.name, x, y)
  y -= size * 0.92

  const eyebrow = [t.eyebrow, t.date].filter(Boolean).join(', ')
  if (eyebrow) {
    font(36, 600)
    ctx.fillStyle = c.text
    ctx.fillText(eyebrow, x, y)
  }
}
