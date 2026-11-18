import { Dumbbell, TrendingUp, Utensils } from 'lucide-react'
import type { Tab } from '@/types'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'treino', label: 'Treino', Icon: Dumbbell },
  { id: 'evolucao', label: 'Evolução', Icon: TrendingUp },
  { id: 'dieta', label: 'Dieta', Icon: Utensils },
] as const

export function BottomNav({ tab, onChange, alerts = {} }: { tab: Tab; onChange: (t: Tab) => void; alerts?: Partial<Record<Tab, string>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-(--z-nav) flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] border-t border-border bg-panel pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={alerts[id] ? `${label}, ${alerts[id]}` : label}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={cn('flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium', tab === id ? 'text-accent' : 'text-faint')}
        >
          <span className="relative">
            <Icon size={20} aria-hidden="true" />
            {alerts[id] && <span aria-hidden="true" className="absolute -top-0.5 -right-1 size-2 rounded-full bg-accent" />}
          </span>
          <span aria-hidden="true">{label}</span>
        </button>
      ))}
    </nav>
  )
}
