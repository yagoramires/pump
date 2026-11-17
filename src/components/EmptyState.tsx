import type { ReactNode } from 'react'
import { IconDot } from './IconDot'

export function EmptyState({ icon, title, tone = 'accent', children }: { icon: ReactNode; title: string; tone?: 'accent' | 'negative'; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <IconDot size={72} color={tone === 'negative' ? 'var(--color-negative)' : 'var(--color-accent)'}>{icon}</IconDot>
      <h1 className="text-xl font-semibold text-strong">{title}</h1>
      {children}
    </div>
  )
}
