import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SheetBody } from '@/components/SheetRow'
import { Chips } from '@/components/Chips'
import { shareFile } from '@/lib/share'
import { CARD_DEFAULTS, renderCard, type CardFormat, type CardInput, type CardOptions } from './shareCard'

const TOGGLES: [Exclude<keyof CardOptions, 'format'>, string][] = [['loads', 'Cargas'], ['date', 'Data'], ['week', 'Semana'], ['map', 'Mapa corporal']]
const FORMATS: Record<CardFormat, string> = { card: 'Cartão', stories: 'Stories' }

export function ShareSheet({ input, onClose }: { input: CardInput; onClose: () => void }) {
  const [opts, setOpts] = useState(CARD_DEFAULTS)
  const [png, setPng] = useState<{ blob: Blob; url: string } | 'error'>()
  useEffect(() => {
    let live = true
    let url: string | undefined
    renderCard(input, opts).then(
      (blob) => { if (live) { url = URL.createObjectURL(blob); setPng({ blob, url }) } },
      () => live && setPng('error'),
    )
    return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [input, opts])
  const ready = png && png !== 'error' ? png : undefined
  const shown = TOGGLES.filter(([k]) => (k === 'week' ? !!input.week : k === 'map' ? input.levels.size > 0 : true))
  // o PNG já pronto: gerar de novo no toque perde a permissão de compartilhar no iOS
  const share = () => ready && shareFile(new File([ready.blob], `pump-treino-${input.date}.png`, { type: 'image/png' })).catch(() => toast.error('Não consegui compartilhar a imagem'))
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="text-title font-semibold text-strong">Compartilhar treino</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">{opts.format === 'stories' ? 'Sem fundo: cole por cima de uma foto sua no Stories.' : 'Escolha o que aparece na imagem.'}</DrawerDescription>
          <div className="pb-3"><Chips label="Formato" options={FORMATS} value={opts.format} onChange={(f) => f && setOpts((o) => ({ ...o, format: f }))} /></div>
          <div className="mx-auto mb-3 aspect-[9/16] h-64 overflow-hidden rounded-xl border border-line bg-panel" style={opts.format === 'stories' ? { background: 'repeating-conic-gradient(#2a2c33 0 25%, #1a1b1f 0 50%) 0 0 / 16px 16px' } : undefined}>
            {ready ? <img src={ready.url} alt="Prévia da imagem do treino" className="size-full object-cover" />
              : <p className="flex size-full items-center justify-center p-3 text-center text-meta text-text-2">{png === 'error' ? 'Não foi possível gerar a imagem' : 'Gerando…'}</p>}
          </div>
          <div className="flex flex-col">
            {shown.map(([k, label]) => (
              <div key={k} className="flex min-h-11 items-center gap-3 border-t border-line first:border-t-0">
                <Label htmlFor={`share-${k}`} className="flex-1 text-body font-normal normal-case tracking-normal text-strong">{label}</Label>
                <Switch id={`share-${k}`} checked={opts[k]} onCheckedChange={(v) => setOpts((o) => ({ ...o, [k]: v }))} />
              </div>
            ))}
          </div>
          <Button className="mt-3 w-full" disabled={!ready} onClick={share}><Share2 aria-hidden="true" /> Compartilhar</Button>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
