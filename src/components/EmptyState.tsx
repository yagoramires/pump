import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, tone = 'neutral', children }: { icon: ReactNode; title: string; tone?: 'neutral' | 'negative'; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-16 pb-10 text-center">
      <span className={cn('flex size-16 items-center justify-center rounded-full', tone === 'negative' ? 'bg-negative-bg text-negative' : 'bg-surface text-text-2')}>{icon}</span>
      <h1 className="text-heading font-bold text-strong">{title}</h1>
      {children}
    </div>
  )
}
