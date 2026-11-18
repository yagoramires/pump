import { useEffect, useRef, useState } from 'react'
import { CameraOff, SwitchCamera, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { savePhoto } from '@/storage/photos'
import { formatDayMonth } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { cn } from '@/lib/utils'
import { ANGLE_LABEL, ANGLES, usePhotoSets } from './photoSets'
import { AngleTabs } from './AngleTabs'
import { fileToJpeg, videoToJpeg } from './resize'

const PILL = 'flex h-11 items-center justify-self-start rounded-[10px] border border-border px-3.5 text-[13px] font-medium text-text'
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

  // um stream por facingMode: trocar ou desmontar para as tracks do anterior
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
    cancelCount() // senão a contagem dispara por cima da foto escolhida
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
      <div className="mt-2">
        <AngleTabs value={ANGLES[i]} onChange={(a) => goTo(ANGLES.indexOf(a))} />
      </div>

      {camOk === false && !preview ? (
        <div className="mb-3 flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-6 text-center text-sm text-text-2">
          <CameraOff size={28} aria-hidden="true" />
          <p>Câmera indisponível — escolha da galeria.</p>
        </div>
      ) : (
        <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-black">
          {camOk !== false && (
            <video ref={video} playsInline muted autoPlay onLoadedData={() => setReady(true)} className={cn('absolute inset-0 size-full object-cover', facing === 'user' && '-scale-x-100')} />
          )}
          {preview ? (
            <img src={preview} alt={`Prévia: ${ANGLE_LABEL[ANGLES[i]]}`} className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <Silhouette />
              {count !== undefined && <span aria-live="polite" className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-strong tabular-nums">{count}</span>}
              <button
                type="button"
                aria-label={`Temporizador ${COUNTDOWN_S} s`}
                aria-pressed={timer}
                className={cn('absolute top-2 left-2 flex size-11 items-center justify-center rounded-full bg-black/50', timer ? 'text-accent' : 'text-white')}
                onClick={() => { cancelCount(); setTimer((t) => !t) }}
              >
                <Timer size={20} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Trocar câmera" className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-black/50 text-white" onClick={flip}>
                <SwitchCamera size={20} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

      {preview ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 rounded-[13px] font-bold" onClick={() => setPreview(undefined)}>Refazer</Button>
          <Button className="h-11 rounded-[13px] font-bold" disabled={saving} onClick={() => void use()}>Usar</Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 items-center">
          <label className={cn(PILL, 'focus-within:ring-2 focus-within:ring-accent/40')}>
            Galeria
            <input type="file" accept="image/*" aria-label="Escolher da galeria" className="sr-only" onChange={pick} />
          </label>
          {camOk === false ? (
            <span />
          ) : (
            <button
              type="button"
              aria-label="Tirar foto"
              disabled={!ready || count !== undefined}
              className="mx-auto flex size-16 items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
              onClick={shutter}
            >
              <span className="size-[50px] rounded-full bg-white" />
            </button>
          )}
          <button type="button" className={cn(PILL, 'justify-self-end')} onClick={() => goTo(i + 1)}>Pular</button>
        </div>
      )}
    </Overlay>
  )
}
