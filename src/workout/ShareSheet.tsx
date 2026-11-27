import { useEffect, useRef, useState } from 'react'
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
import { CARD_DEFAULTS, renderCard, type CardBackground, type CardFormat, type CardInput, type CardOptions } from './shareCard'

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
  const [result, setResult] = useState<{ input: CardInput; opts: CardOptions; background: CardBackground; size: number; png?: { blob: Blob; url: string } }>()
  const picker = useRef<HTMLInputElement>(null)
  const story = opts.format === 'stories'
  const background = selectedBackground ?? (story ? 'transparent' : 'solid')
  const hasPhoto = typeof background !== 'string'
  const size = hasPhoto ? photoSize : 100
  useEffect(() => {
    let live = true
    const render = () => renderCard(input, opts, background, size).then(
      (blob) => live && setResult({ input, opts, background, size, png: { blob, url: URL.createObjectURL(blob) } }),
      () => live && setResult({ input, opts, background, size }),
    )
    // Evita codificar um PNG a cada passo enquanto a pessoa arrasta.
    const pending = hasPhoto ? setTimeout(render, 80) : undefined
    if (!hasPhoto) void render()
    return () => { live = false; clearTimeout(pending) }
  }, [input, opts, background, size, hasPhoto])
  const url = result?.png?.url
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const matching = result?.input === input && result.opts === opts && result.background === background ? result : undefined
  const current = matching?.size === size ? matching : undefined
  const ready = current?.png
  const preview = matching?.png
  const unavailable: Partial<Record<Option, string>> = {
    duration: input.minutes === null ? 'Sem duração registrada' : undefined,
    highlight: input.highlight.kind === 'neutral' ? 'Sem destaque neste treino' : undefined,
    loads: input.highlight.kind !== 'record' && input.highlight.kind !== 'improved' ? 'Sem carga no destaque' : !opts.highlight ? 'Ative Destaque para incluir a carga' : undefined,
    week: input.week ? undefined : 'Sem dados da semana',
    map: input.levels.size ? undefined : 'Sem músculos registrados',
  }
  // o PNG já pronto: gerar de novo no toque perde a permissão de compartilhar no iOS
  const share = () => ready && shareFile(new File([ready.blob], `pump-treino-${input.date}.png`, { type: 'image/png' })).catch(() => toast.error('Não consegui compartilhar a imagem'))
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="text-title font-semibold text-strong">Compartilhar treino</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Escolha o formato, o fundo e os dados da imagem.</DrawerDescription>
          <div className="pb-3"><Chips label="Formato" options={FORMATS} value={opts.format} onChange={(f) => f && setOpts((o) => ({ ...o, format: f }))} /></div>
          <div className={cn('mx-auto mb-3 h-56 shrink-0 overflow-hidden rounded-xl border border-line bg-panel', story ? 'aspect-[9/16]' : 'aspect-[4/5]', background === 'transparent' && 'bg-[repeating-conic-gradient(var(--color-surface)_0_25%,var(--color-panel)_0_50%)] bg-size-[16px_16px]')}>
            {preview ? <img src={preview.url} alt="Prévia da imagem do treino" className="size-full object-contain" />
              : <p role="status" className="flex size-full items-center justify-center p-2 text-center text-caption text-text-2">{current ? (hasPhoto ? 'Tente outra foto de fundo.' : 'Não consegui gerar a imagem.') : 'Gerando…'}</p>}
          </div>
          <div className="mb-3 grid gap-2">
            <Chips label="Fundo" options={BACKGROUNDS} value={hasPhoto ? undefined : background} onChange={(value) => value && setBackground(value)} />
            <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) {
                setBackground(file)
                setPhotoSize(100)
              }
              event.currentTarget.value = ''
            }} />
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => picker.current?.click()}><ImagePlus aria-hidden="true" />{hasPhoto ? 'Trocar foto de fundo' : 'Adicionar foto de fundo'}</Button>
            {hasPhoto && (
              <div data-vaul-no-drag className="pt-1">
                <div className="flex justify-between gap-2 text-meta text-text-2">
                  <span>Tamanho da foto</span>
                  <span aria-hidden="true" className="tabular-nums">{size}%</span>
                </div>
                <Slider aria-label="Tamanho da foto" aria-valuetext={`${size}%`} min={50} max={200} step={5} value={[size]} onValueChange={([value]) => setPhotoSize(value)} className="min-h-11" />
              </div>
            )}
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
          <Button size="lg" className="mt-3 w-full" disabled={!ready} onClick={share}><Share2 aria-hidden="true" /> Compartilhar</Button>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
