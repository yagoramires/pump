import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { usePhoto } from './usePhoto'

export function PhotoThumb({ id, alt, className, empty, children }: { id?: string; alt: string; className?: string; empty?: ReactNode; children?: ReactNode }) {
  const src = usePhoto(id)
  return (
    <div className={cn('relative aspect-3/4 overflow-hidden bg-surface', className)}>
      {src ? <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" /> : empty}
      {children}
    </div>
  )
}
