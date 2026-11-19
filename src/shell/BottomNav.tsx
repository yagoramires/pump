import { Dumbbell, TrendingUp, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tab } from '@/schema'

const TABS = {
  treino: { label: 'Treino', Icon: Dumbbell },
  evolucao: { label: 'Evolução', Icon: TrendingUp },
  dieta: { label: 'Dieta', Icon: Utensils },
} satisfies Record<Tab, { label: string; Icon: typeof Dumbbell }>

const tabIds = Object.keys(TABS) as Tab[]

export function BottomNav({ tab, onChange, alerts = {} }: { tab: Tab; onChange: (t: Tab) => void; alerts?: Partial<Record<Tab, string>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-(--z-nav) flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] border-t border-border bg-panel pb-[env(safe-area-inset-bottom)]">
      {tabIds.map((id) => {
        const { label, Icon } = TABS[id]
        return (
          <Button
            key={id}
            variant="nav"
            size="tab"
            type="button"
            aria-label={alerts[id] ? `${label}, ${alerts[id]}` : label}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <span className="relative">
              <Icon size={20} aria-hidden="true" />
              {alerts[id] && <span aria-hidden="true" className="absolute -top-0.5 -right-1 size-2 rounded-full bg-accent" />}
            </span>
            <span aria-hidden="true">{label}</span>
          </Button>
        )
      })}
    </nav>
  )
}
