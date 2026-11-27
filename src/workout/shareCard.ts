import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { formatDayLabel, p2, parseDayKey } from '@/lib/date'
import { formatKg } from '@/lib/number'
import { EXPORT_BODY_COLORS } from './bodyParts'
import type { Highlight, MuscleLevel } from './summary'

export type CardInput = {
  label: string; name: string; date: string; minutes: number | null; sets: number; exercises: number
  highlight: Highlight; week?: { days: number; goal: number }; levels: Map<string, MuscleLevel>
}
export type CardFormat = 'card' | 'stories'
export type CardOptions = {
  format: CardFormat; duration: boolean; sets: boolean; exercises: boolean; highlight: boolean; loads: boolean; date: boolean; week: boolean; map: boolean
}
export const CARD_DEFAULTS: CardOptions = { format: 'card', duration: true, sets: true, exercises: true, highlight: true, loads: false, date: false, week: true, map: true }

export type CardBackground = 'solid' | 'transparent' | File
type HighlightText = { big: string; label: string }

const dayMonth = (key: string) => { const d = parseDayKey(key); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}` }

function highlightRow(h: Highlight, loads: boolean): HighlightText | undefined {
  const row = (big: string, label: string) => ({ big, label })
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

const compactDuration = (m: number) => m < 60 ? `${m}min` : `${Math.floor(m / 60)}h${p2(m % 60)}`

export function cardContent(input: CardInput, opts: CardOptions) {
  const highlight = opts.highlight ? highlightRow(input.highlight, opts.loads) : undefined
  const stats: [string, string][] = []
  if (opts.duration && input.minutes !== null) stats.push([compactDuration(input.minutes), 'Duração'])
  if (opts.sets) stats.push([String(input.sets), input.sets === 1 ? 'Série' : 'Séries'])
  if (opts.exercises) stats.push([String(input.exercises), input.exercises === 1 ? 'Exercício' : 'Exercícios'])
  return {
    label: input.label === 'Extra' ? undefined : `Treino ${input.label}`,
    title: input.name,
    stats,
    highlight: highlight && `${highlight.big} ${highlight.label}`,
    week: opts.week && input.week ? `${input.week.days} de ${input.week.goal} treinos na semana` : undefined,
    date: opts.date ? formatDayLabel(input.date).toLowerCase() : undefined,
  }
}

const WIDTH = 1080
const PAD = 76
const FONT = '-apple-system, "SF Pro Display", Inter, sans-serif'

/** a mesma figura do resumo, renderizada fora da tela e virada imagem (SVG com as cores já resolvidas) */
async function bodyImages(levels: CardInput['levels']): Promise<HTMLImageElement[]> {
  await Promise.resolve() // flushSync não pode rodar dentro do efeito que chamou o renderCard
  const { BodyFigures } = await import('./BodyMap')
  const div = document.createElement('div')
  const root = createRoot(div)
  flushSync(() => root.render(createElement(BodyFigures, { levels, colors: { ...EXPORT_BODY_COLORS, base: '#ffffff59' }, scale: 2 })))
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

export async function renderCard(input: CardInput, opts: CardOptions, background: CardBackground): Promise<Blob> {
  const height = opts.format === 'stories' ? 1920 : 1350
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponível')

  const photo = typeof background !== 'string'
  if (background !== 'transparent') {
    ctx.fillStyle = '#1d232d'
    ctx.fillRect(0, 0, WIDTH, height)
  }
  if (photo) {
    const url = URL.createObjectURL(background)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const scale = Math.max(WIDTH / image.naturalWidth, height / image.naturalHeight)
      const width = image.naturalWidth * scale
      const scaledHeight = image.naturalHeight * scale
      ctx.drawImage(image, (WIDTH - width) / 2, (height - scaledHeight) / 2, width, scaledHeight)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const shadeTop = photo ? 0 : height * 0.35
  const shade = ctx.createLinearGradient(0, shadeTop, 0, height)
  shade.addColorStop(0, photo ? '#10141b99' : '#10141b00')
  if (photo) shade.addColorStop(0.27, '#10141b00')
  shade.addColorStop(1, '#0b0e13f5')
  ctx.fillStyle = shade
  ctx.fillRect(0, shadeTop, WIDTH, height - shadeTop)

  const content = cardContent(input, opts)
  const figures = opts.map && input.levels.size ? await bodyImages(input.levels) : []
  drawContent(ctx, height, content, figures, background === 'transparent')
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (
    blob ? resolve(blob) : reject(new Error('png vazio'))
  ), 'image/png'))
}

function drawContent(ctx: CanvasRenderingContext2D, height: number, content: ReturnType<typeof cardContent>, figures: HTMLImageElement[], transparent: boolean) {
  const bottom = height - PAD
  const fullWidth = WIDTH - PAD * 2
  const textWidth = fullWidth - (figures.length ? 300 : 0)
  ctx.shadowColor = '#000c'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 2
  let y = bottom
  const text = (value: string, size: number, weight: number, color = '#fff', maxWidth = textWidth) => {
    ctx.font = `${weight} ${size}px ${FONT}`
    ctx.fillStyle = color
    ctx.fillText(value, PAD, y, maxWidth)
  }

  const font = (size: number, weight: number) => { ctx.font = `${weight} ${size}px ${FONT}` }
  if (content.week) {
    text(content.week, 31, 500, '#d5dbe3')
    y -= 55
  }
  if (content.highlight) {
    font(34, 700)
    wrap(ctx, content.highlight, textWidth).reverse().forEach((line) => {
      text(line, 34, 700, '#c6ff3d')
      y -= 42
    })
    y -= 20
  }
  if (content.stats.length) {
    const column = textWidth / content.stats.length
    content.stats.forEach(([value, label], i) => {
      const x = PAD + i * column
      font(29, 500)
      ctx.fillStyle = '#d5dbe3'
      ctx.fillText(label, x, y, column - 10)
      font(68, 800)
      ctx.fillStyle = '#fff'
      ctx.fillText(value, x, y - 40, column - 10)
    })
    y -= 142
  }

  const titleSize = figures.length ? 97 : 122
  text(content.title, titleSize, 900)
  y -= titleSize + 8
  if (content.label) {
    text(content.label, 35, 600, '#d5dbe3')
    y -= 58
  }
  if (transparent) {
    text(['pump', content.date].filter(Boolean).join(' · '), 37, 800)
  } else {
    y = PAD + 32
    text('pump', 63, 950)
    if (content.date) {
      ctx.textAlign = 'right'
      font(33, 500)
      ctx.fillStyle = '#e2e7ed'
      ctx.fillText(content.date, WIDTH - PAD, y, fullWidth - 240)
    }
  }

  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  const figureWidth = 146
  figures.forEach((image, i) => {
    ctx.drawImage(image, WIDTH - PAD - 270 + i * 124, bottom - figureWidth * 2, figureWidth, figureWidth * 2)
  })
}
