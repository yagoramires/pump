import type { ReactNode } from 'react'
import { IconDot } from './IconDot'
import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, tone = 'accent', children }: { icon: ReactNode; title: string; tone?: 'accent' | 'negative'; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-16 pb-10 text-center">
      <span className={cn('rounded-full border', tone === 'negative' ? 'border-negative/30' : 'border-accent-line')}>
        <IconDot size={72} color={tone === 'negative' ? 'var(--color-negative)' : 'var(--color-accent)'}>{icon}</IconDot>
      </span>
      <h1 className="text-xl font-semibold text-strong">{title}</h1>
      {children}
    </div>
  )
}
