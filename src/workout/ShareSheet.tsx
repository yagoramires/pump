import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImagePlus, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { SheetBody } from '@/components/SheetRow'
import { Chips } from '@/components/Chips'
import { shareFile } from '@/lib/share'
import { cn } from '@/lib/utils'
import { CARD_DEFAULTS, PHOTO_CENTER, cardPng, prepareCard, type CardBackground, type CardFormat, type CardInput, type CardOptions, type PhotoPosition } from './shareCard'

type Option = Exclude<keyof CardOptions, 'format'>
const TOGGLES: [Option, string][] = [
  ['duration', 'Duração'], ['sets', 'Séries'], ['exercises', 'Exercícios'], ['highlight', 'Destaque'],
  ['loads', 'Carga do destaque'], ['date', 'Data'], ['week', 'Semana'], ['map', 'Mapa corporal'],
]
const FORMATS: Record<CardFormat, string> = { card: 'Post 4:5', stories: 'Stories 9:16' }
const BACKGROUNDS = { solid: 'Sólido', transparent: 'Transparente' }

export function ShareSheet({ input, onClose }: { input: CardInput; onClose: () => void }) {
  const [opts, setOpts] = useState(CARD_DEFAULTS)
  const [selectedBackground, setBackground] = useState<CardBackground>()
  const [photoSize, setPhotoSize] = useState(100)
  const [position, setPosition] = useState(PHOTO_CENTER)
  const [result, setResult] = useState<{ input: CardInput; opts: CardOptions; background: CardBackground; card?: Awaited<ReturnType<typeof prepareCard>> }>()
  const [exported, setExported] = useState<{ card: typeof result; size: number; position: PhotoPosition; blob: Blob | null }>()
  const picker = useRef<HTMLInputElement>(null)
  const preview = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ id: number; x: number; y: number }>(null)
  const story = opts.format === 'stories'
  const background = selectedBackground ?? (story ? 'transparent' : 'solid')
  const hasPhoto = typeof background !== 'string'
  const size = hasPhoto ? photoSize : 100
  const framing = hasPhoto ? position : PHOTO_CENTER
  useEffect(() => {
    let live = true
    prepareCard(input, opts, background).then(
      (card) => live && setResult({ input, opts, background, card }),
      () => live && setResult({ input, opts, background }),
    )
    return () => { live = false }
  }, [input, opts, background])
  const current = result?.input === input && result.opts === opts && result.background === background ? result : undefined
  const card = current?.card
  useLayoutEffect(() => {
    const canvas = preview.current
    if (!canvas || !card) return
    card.draw(canvas, size, framing)
    let live = true
    // Atualiza a prévia enquanto arrasta e codifica o PNG quando o gesto desacelera.
    const pending = setTimeout(() => {
      cardPng(canvas).then(
        (blob) => live && setExported({ card: current, size, position: framing, blob }),
        () => live && setExported({ card: current, size, position: framing, blob: null }),
      )
    }, hasPhoto ? 100 : 0)
    return () => { live = false; clearTimeout(pending) }
  }, [card, current, size, framing, hasPhoto])
  const exportResult = exported?.card === current && exported?.size === size && exported.position === framing ? exported : undefined
  const ready = exportResult?.blob
  const move = (x: number, y: number) => {
    if (card) setPosition((previous) => {
      const start = card.bound(size, previous)
      return card.bound(size, { x: start.x + x, y: start.y + y })
    })
  }
  const unavailable: Partial<Record<Option, string>> = {
    duration: input.minutes === null ? 'Sem duração registrada' : undefined,
    highlight: input.highlight.kind === 'neutral' ? 'Sem destaque neste treino' : undefined,
    loads: input.highlight.kind !== 'record' && input.highlight.kind !== 'improved' ? 'Sem carga no destaque' : !opts.highlight ? 'Ative Destaque para incluir a carga' : undefined,
    week: input.week ? undefined : 'Sem dados da semana',
    map: input.levels.size ? undefined : 'Sem músculos registrados',
  }
  // o PNG já pronto: gerar de novo no toque perde a permissão de compartilhar no iOS
  const share = () => ready && shareFile(new File([ready], `pump-treino-${input.date}.png`, { type: 'image/png' })).catch(() => toast.error('Não consegui compartilhar a imagem'))
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="text-title font-semibold text-strong">Compartilhar treino</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Escolha o formato, o fundo e os dados da imagem.</DrawerDescription>
          <div className="pb-3"><Chips label="Formato" options={FORMATS} value={opts.format} onChange={(f) => f && setOpts((o) => ({ ...o, format: f }))} /></div>
          <div data-vaul-no-drag={hasPhoto || undefined} className={cn('mx-auto mb-3 shrink-0 overflow-hidden rounded-xl border border-line bg-panel', hasPhoto ? 'h-72' : 'h-56', story ? 'aspect-[9/16]' : 'aspect-[4/5]', background === 'transparent' && 'bg-[repeating-conic-gradient(var(--color-surface)_0_25%,var(--color-panel)_0_50%)] bg-size-[16px_16px]')}>
            {card ? <canvas ref={preview} width={card.width} height={card.height} role={hasPhoto ? 'group' : 'img'} aria-label="Prévia da imagem do treino" aria-describedby={hasPhoto ? 'share-photo-instructions' : undefined} tabIndex={hasPhoto ? 0 : undefined}
              className={cn('size-full', hasPhoto && 'touch-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent')}
              onPointerDown={(event) => {
                if (!hasPhoto || !event.isPrimary || event.button !== 0) return
                event.currentTarget.setPointerCapture(event.pointerId)
                drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
              }}
              onPointerMove={(event) => {
                const previous = drag.current
                if (!previous || previous.id !== event.pointerId) return
                const { width, height } = event.currentTarget.getBoundingClientRect()
                drag.current = { ...previous, x: event.clientX, y: event.clientY }
                move((event.clientX - previous.x) / width, (event.clientY - previous.y) / height)
              }}
              onLostPointerCapture={() => { drag.current = null }}
              onKeyDown={(event) => {
                if (!hasPhoto) return
                const step = 0.025
                if (event.key === 'ArrowLeft') move(-step, 0)
                else if (event.key === 'ArrowRight') move(step, 0)
                else if (event.key === 'ArrowUp') move(0, -step)
                else if (event.key === 'ArrowDown') move(0, step)
                else return
                event.preventDefault()
              }} />
              : <p role="status" className="flex size-full items-center justify-center p-2 text-center text-caption text-text-2">{current ? (hasPhoto ? 'Tente outra foto de fundo.' : 'Não consegui gerar a imagem.') : 'Gerando…'}</p>}
          </div>
          {hasPhoto && (
            <div data-vaul-no-drag className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <p id="share-photo-instructions" className="text-caption text-text-2">Arraste a foto ou use as setas do teclado.</p>
                <Button size="sm" variant="outline" className="h-11" onClick={() => setPosition(PHOTO_CENTER)}>Centralizar</Button>
              </div>
              <div className="flex justify-between gap-2 text-meta text-text-2">
                <span>Zoom da foto</span>
                <span aria-hidden="true" className="tabular-nums">{size}%</span>
              </div>
              <Slider aria-label="Zoom da foto" aria-valuetext={`${size}%`} min={50} max={200} step={5} value={[size]} onValueChange={([value]) => {
                setPhotoSize(value)
                if (card) setPosition((previous) => card.bound(value, previous))
              }} className="min-h-11" />
            </div>
          )}
          <div className="mb-3 grid gap-2">
            <Chips label="Fundo" options={BACKGROUNDS} value={hasPhoto ? undefined : background} onChange={(value) => value && setBackground(value)} />
            <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) {
                setBackground(file)
                setPhotoSize(100)
                setPosition(PHOTO_CENTER)
              }
              event.currentTarget.value = ''
            }} />
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => picker.current?.click()}><ImagePlus aria-hidden="true" />{hasPhoto ? 'Trocar foto de fundo' : 'Adicionar foto de fundo'}</Button>
          </div>
          <div className="flex flex-col">
            {TOGGLES.map(([k, label]) => (
              <div key={k} className="flex min-h-11 items-center gap-3 border-t border-line first:border-t-0">
                <Label htmlFor={`share-${k}`} className="min-h-11 flex-1 flex-col items-start justify-center gap-0 py-1 text-body font-normal normal-case tracking-normal text-strong">
                  {label}
                  {unavailable[k] && <span id={`share-note-${k}`} className="text-caption text-text-2">{unavailable[k]}</span>}
                </Label>
                <Switch id={`share-${k}`} aria-label={label} checked={!unavailable[k] && opts[k]} disabled={!!unavailable[k]} aria-describedby={unavailable[k] ? `share-note-${k}` : undefined} onCheckedChange={(v) => setOpts((o) => ({ ...o, [k]: v }))} />
              </div>
            ))}
          </div>
          {exportResult?.blob === null && <p role="status" className="text-meta text-text-2">Não consegui preparar o PNG. Ajuste a imagem e tente de novo.</p>}
          <Button size="lg" className="mt-3 w-full" disabled={!ready} onClick={share}><Share2 aria-hidden="true" /> Compartilhar</Button>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
