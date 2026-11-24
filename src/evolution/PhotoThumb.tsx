import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'
import { usePhoto } from './usePhoto'

/** zoom: com foto carregada, o toque abre a foto grande */
export function PhotoThumb({ id, alt, className, empty, children, zoom }: { id?: string; alt: string; className?: string; empty?: ReactNode; children?: ReactNode; zoom?: boolean }) {
  const src = usePhoto(id)
  const [open, setOpen] = useState(false)
  const box = cn('relative aspect-3/4 overflow-hidden bg-surface', className)
  const body = <>{src ? <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" /> : empty}{children}</>
  if (!zoom || !src) return <div className={box}>{body}</div>
  return (
    <>
      <Button type="button" variant="ghost" aria-label={`Ver ${alt}`} className={cn('h-auto w-full p-0 font-normal hover:bg-surface', box)} onClick={() => setOpen(true)}>{body}</Button>
      {open && (
        <Drawer open onOpenChange={(o) => !o && setOpen(false)}>
          <DrawerContent>
            <SheetBody>
              <DrawerTitle className="pb-3 text-title font-semibold text-strong">{alt}</DrawerTitle>
              <DrawerDescription className="sr-only">Foto em tamanho maior</DrawerDescription>
              <img src={src} alt={alt} className="max-h-[65vh] w-full rounded-card object-contain" />
            </SheetBody>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}
