import { useEffect, useState } from 'react'
import type { SessionExercise } from './types'
import { imageUrl } from '../catalog/catalog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

export function ExercisePreview({ exercise, onClose }: { exercise: SessionExercise; onClose: () => void }) {
  const [frame, setFrame] = useState(0)
  const { images } = exercise
  const steps = exercise.instructions.filter(Boolean)
  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => setFrame((f) => (f + 1) % 2), 1000)
    return () => clearInterval(id)
  }, [images.length])

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-3 pb-5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-[19px] font-semibold text-strong">{exercise.name}</DrawerTitle>
              <DrawerDescription className="mt-0.5 text-[13px] text-text-2 first-letter:uppercase">{exercise.muscles.join(' · ')}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar" className="-mt-2 -mr-2 text-text-2"><X className="size-5" aria-hidden="true" /></Button>
            </DrawerClose>
          </div>
          {images.length > 0 && (
            <div className={cn('relative shrink-0 overflow-hidden rounded-[14px] bg-surface', images.length > 1 && 'pb-6')}>
              <img className="h-52 w-full object-contain" src={imageUrl(images[frame % images.length])} alt={exercise.name} />
              {images.length > 1 && (
                <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
                  {[0, 1].map((i) => <i key={i} className={cn('size-1.5 rounded-full', frame === i ? 'bg-accent' : 'bg-border-strong')} />)}
                </div>
              )}
            </div>
          )}
          {steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-text">
              {steps.map((t, i) => <li key={i}>{t}</li>)}
            </ol>
          )}
          {exercise.note && <p className="rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">{exercise.note}</p>}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
