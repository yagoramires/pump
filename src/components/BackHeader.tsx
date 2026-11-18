import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BackHeader({ title, onBack, label = 'Voltar', className, titleClassName, children }: { title: string; onBack: () => void; label?: string; className?: string; titleClassName?: string; children?: ReactNode }) {
  return (
    <header className={cn('flex items-center gap-3 py-2', className)}>
      <button type="button" className="icon-btn" aria-label={label} onClick={onBack}><ChevronLeft size={18} /></button>
      <h1 className={cn('flex-1 text-[19px] font-semibold text-strong', titleClassName)}>{title}</h1>
      {children}
    </header>
  )
}
