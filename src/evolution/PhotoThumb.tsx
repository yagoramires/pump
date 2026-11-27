import { useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { formatDayMonth } from '@/lib/date'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'
import { usePhoto } from './usePhoto'
import { ANGLES, ANGLE_LABEL, type PhotoSet } from './types'

function PhotoPreview({ id, alt, set, onClose }: { id: string; alt: string; set?: PhotoSet; onClose: () => void }) {
  const photos = set ? ANGLES.flatMap((angle) => {
    const photoId = set[angle]
    return photoId ? [{ id: photoId, alt: `${ANGLE_LABEL[angle]}, ${formatDayMonth(set.date)}` }] : []
  }) : [{ id, alt }]
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((photo) => photo.id === id)))
  const photo = photos[index] ?? { id, alt }
  const src = usePhoto(photo.id)
  const start = useRef<{ x: number; y: number }>(null)
  const move = (delta: number) => setIndex((current) => Math.max(0, Math.min(photos.length - 1, current + delta)))

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') move(-1)
        if (event.key === 'ArrowRight') move(1)
      }}>
        <SheetBody>
          <DrawerTitle aria-live="polite" className="pb-3 text-title font-semibold text-strong">{photo.alt}</DrawerTitle>
          <DrawerDescription className="sr-only">Fotos do registro em tamanho maior</DrawerDescription>
          <div data-vaul-no-drag className="flex h-[min(52dvh,32rem)] touch-pan-y items-center justify-center rounded-card bg-surface"
            onTouchStart={(event) => {
              const touch = event.touches[0]
              start.current = { x: touch.clientX, y: touch.clientY }
            }}
            onTouchCancel={() => { start.current = null }}
            onTouchEnd={(event) => {
              const touch = event.changedTouches[0]
              const origin = start.current
              start.current = null
              if (!origin) return
              const dx = touch.clientX - origin.x
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(touch.clientY - origin.y)) move(dx < 0 ? 1 : -1)
            }}>
            {src ? <img src={src} alt={photo.alt} className="size-full object-contain" /> : <ImageOff role="img" aria-label="Foto indisponível" className="text-text-2" />}
          </div>
          {photos.length > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <Button variant="ghost" size="icon" className="size-11" aria-label="Foto anterior" disabled={index === 0} onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></Button>
              <span className="text-meta text-text-2">{index + 1} de {photos.length}</span>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Próxima foto" disabled={index >= photos.length - 1} onClick={() => move(1)}><ChevronRight aria-hidden="true" /></Button>
            </div>
          )}
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}

export function PhotoThumb({ id, alt, className, empty, children, zoom, set }: { id?: string; alt: string; className?: string; empty?: ReactNode; children?: ReactNode; zoom?: boolean; set?: PhotoSet }) {
  const src = usePhoto(id)
  const [open, setOpen] = useState(false)
  const box = cn('relative aspect-3/4 overflow-hidden bg-surface', className)
  const body = <>{src ? <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" /> : empty}{children}</>
  if (!zoom || !src || !id) return <div className={box}>{body}</div>
  return (
    <>
      <Button type="button" variant="ghost" aria-label={`Ver ${alt}`} className={cn('h-auto w-full p-0 font-normal hover:bg-surface', box)} onClick={() => setOpen(true)}>{body}</Button>
      {open && <PhotoPreview id={id} alt={alt} set={set} onClose={() => setOpen(false)} />}
    </>
  )
}
