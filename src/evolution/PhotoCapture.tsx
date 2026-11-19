import { useEffect, useRef, useState } from 'react'
import { CameraOff, SwitchCamera, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { savePhoto } from '@/storage/photos'
import { formatDayMonth } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { cn } from '@/lib/utils'
import { ANGLE_LABEL, ANGLES } from './types'
import { usePhotoSets } from './usePhotoSets'
import { AngleTabs } from './AngleTabs'
import { fileToJpeg, videoToJpeg } from './resize'

const OVER = 'absolute top-2 size-11 rounded-full bg-black/50 text-white hover:bg-black/50 hover:text-white'
const COUNTDOWN_S = 5
// sem contexto seguro (http) ou navegador antigo, navigator.mediaDevices/getUserMedia não existe
const hasCamera = () => typeof navigator.mediaDevices?.getUserMedia === 'function'

const Silhouette = () => (
  <svg viewBox="0 0 100 200" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[8%] mx-auto h-[84%] fill-none stroke-accent/40" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round">
    <circle cx="50" cy="26" r="13" />
    <path d="M30 52 Q50 42 70 52 L78 102 L69 104 L66 76 L64 120 L62 188 L52 188 L50 128 L48 188 L38 188 L36 120 L34 76 L31 104 L22 102 Z" />
  </svg>
)

export function PhotoCapture({ date, onClose }: { date: string; onClose: () => void }) {
  const { setAngle } = usePhotoSets()
  const [i, setI] = useState(0)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [camOk, setCamOk] = useState<boolean | undefined>(() => (hasCamera() ? undefined : false))
  const [ready, setReady] = useState(false)
  const [timer, setTimer] = useState(false)
  const [count, setCount] = useState<number>()
  const [preview, setPreview] = useState<string>()
  const [saving, setSaving] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream>(undefined)
  const tick = useRef<number>(undefined)

  useEffect(() => {
    if (!hasCamera()) return
    let alive = true
    let s: MediaStream | undefined
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } })
      .then((got) => {
        s = got
        if (!alive) return got.getTracks().forEach((t) => t.stop())
        stream.current = got
        if (video.current) video.current.srcObject = got
        setCamOk(true)
      })
      // sem câmera traseira, volta pra frontal; só sem nenhuma cai na galeria
      .catch(() => alive && (facing === 'environment' ? setFacing('user') : setCamOk(false)))
    return () => {
      alive = false
      s?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  useEffect(() => () => clearInterval(tick.current), [])

  const cancelCount = () => {
    clearInterval(tick.current)
    setCount(undefined)
  }
  const close = () => {
    cancelCount()
    stream.current?.getTracks().forEach((t) => t.stop())
    onClose()
  }
  const goTo = (n: number) => {
    cancelCount()
    setPreview(undefined)
    if (n >= ANGLES.length) close()
    else setI(n)
  }
  const shoot = () => {
    if (video.current) videoToJpeg(video.current, facing === 'user').then(setPreview, () => toast.error('Não consegui tirar a foto'))
  }
  const shutter = () => {
    if (!timer) return shoot()
    let n = COUNTDOWN_S
    setCount(n)
    tick.current = window.setInterval(() => {
      n -= 1
      if (n > 0) return setCount(n)
      cancelCount()
      shoot()
    }, 1000)
  }
  const flip = () => {
    cancelCount()
    setReady(false)
    setFacing((f) => (f === 'user' ? 'environment' : 'user'))
  }
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelCount()
    const file = e.target.files?.[0]
    e.target.value = '' // escolher o mesmo arquivo de novo dispara onChange
    if (file) fileToJpeg(file).then(setPreview, () => toast.error('Não consegui abrir a imagem'))
  }
  const use = async () => {
    if (!preview) return
    setSaving(true)
    let id: string
    try {
      id = await savePhoto(preview)
    } catch {
      setSaving(false)
      return void toast.error('Não consegui salvar a foto')
    }
    setAngle(date, ANGLES[i], id)
    setSaving(false)
    goTo(i + 1)
  }

  return (
    <Overlay>
      <BackHeader title={`Fotos · ${formatDayMonth(date)}`} onBack={close} />
      <div className="flex flex-col gap-3">
      <AngleTabs value={ANGLES[i]} onChange={(a) => goTo(ANGLES.indexOf(a))} />

      {camOk === false && !preview ? (
        <Card variant="inset" className="aspect-3/4 items-center justify-center gap-3 text-center text-meta text-text-2">
          <CameraOff size={28} aria-hidden="true" />
          <p>Câmera indisponível — escolha da galeria.</p>
        </Card>
      ) : (
        <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-border bg-black">
          {camOk !== false && (
            <video ref={video} playsInline muted autoPlay onLoadedData={() => setReady(true)} className={cn('absolute inset-0 size-full object-cover', facing === 'user' && '-scale-x-100')} />
          )}
          {preview ? (
            <img src={preview} alt={`Prévia: ${ANGLE_LABEL[ANGLES[i]]}`} className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <Silhouette />
              {count !== undefined && <span aria-live="polite" className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-strong tabular-nums">{count}</span>}
              <Toggle
                aria-label={`Temporizador ${COUNTDOWN_S} s`}
                pressed={timer}
                className={cn(OVER, 'left-2 data-[state=on]:bg-black/50 data-[state=on]:text-accent')}
                onPressedChange={() => { cancelCount(); setTimer((t) => !t) }}
              >
                <Timer size={20} aria-hidden="true" />
              </Toggle>
              <Button type="button" variant="ghost" size="icon" aria-label="Trocar câmera" className={cn(OVER, 'right-2')} onClick={flip}>
                <SwitchCamera size={20} aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      )}

      {preview ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setPreview(undefined)}>Refazer</Button>
          <Button disabled={saving} onClick={() => void use()}>Usar</Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 items-center">
          <Button asChild variant="outline" size="sm" className="cursor-pointer justify-self-start font-medium focus-within:ring-[3px] focus-within:ring-ring/50">
            <label>
              Galeria
              <input type="file" accept="image/*" aria-label="Escolher da galeria" className="sr-only" onChange={pick} />
            </label>
          </Button>
          {camOk === false ? (
            <span />
          ) : (
            <Button
              type="button"
              variant="ghost"
              aria-label="Tirar foto"
              disabled={!ready || count !== undefined}
              className="mx-auto size-16 rounded-full border-4 border-white bg-transparent p-0 hover:bg-transparent disabled:opacity-40"
              onClick={shutter}
            >
              <span className="size-12.5 rounded-full bg-white" />
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="justify-self-end font-medium" onClick={() => goTo(i + 1)}>Pular</Button>
        </div>
      )}
      </div>
    </Overlay>
  )
}
