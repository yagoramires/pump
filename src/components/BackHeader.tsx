import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BackHeader({ title, onBack, label = 'Voltar', className, titleClassName, children }: { title: string; onBack: () => void; label?: string; className?: string; titleClassName?: string; children?: ReactNode }) {
  return (
    <header className={cn('flex items-center gap-1.5 py-2', className)}>
      <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onBack}><ChevronLeft size={22} /></Button>
      <h1 className={cn('flex-1 text-title font-bold text-strong', titleClassName)}>{title}</h1>
      {children}
    </header>
  )
}
