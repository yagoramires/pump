import { Flame, Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { IconDot } from '@/components/IconDot'
import { cn } from '@/lib/utils'
import type { EvoHighlight } from './highlights'

const ICON = { down: TrendingDown, up: TrendingUp, flat: Minus } as const

function look(h: EvoHighlight) {
  if (h.kind === 'record') return { Icon: Trophy, color: 'var(--color-accent)' }
  if (h.kind === 'streak') return { Icon: Flame, color: 'var(--c7)' }
  return { Icon: ICON[h.trend ?? 'flat'], color: 'var(--c2)' }
}

/** até 3 frases do que mudou; sem nenhuma, o card some */
export function HighlightsCard({ items }: { items: EvoHighlight[] }) {
  if (!items.length) return null
  return (
    <Card size="flush">
      <CardHeader className="pb-1">
        <CardTitle>Destaques</CardTitle>
        <CardAction className="text-meta text-text-2">últimos 30 dias</CardAction>
      </CardHeader>
      {items.map((h, i) => {
        const { Icon, color } = look(h)
        return (
          <div key={h.kind} className={cn('flex items-start gap-3 px-3.5 py-2.5', i > 0 && 'border-t border-line')}>
            <IconDot size={32} color={color}><Icon size={16} aria-hidden="true" /></IconDot>
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-strong">{h.title}</span>
              <span className="text-meta text-text-2">{h.detail}</span>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
