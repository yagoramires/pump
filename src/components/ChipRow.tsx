import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Toggle } from '@/components/ui/toggle'

/** fileira de chips que rola na horizontal sem barra */
export function ChipRow({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)} role="group" aria-label={label}>
      {children}
    </div>
  )
}

export function Chip({ className, ...props }: ComponentProps<typeof Toggle>) {
  return <Toggle variant="outline" className={cn('shrink-0 text-meta', className)} {...props} />
}
