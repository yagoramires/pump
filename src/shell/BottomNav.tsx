import { Dumbbell, TrendingUp, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tab } from '@/schema'
import { cn } from '@/lib/utils'

const TABS = {
  treino: { label: 'Treino', Icon: Dumbbell },
  evolucao: { label: 'Evolução', Icon: TrendingUp },
  dieta: { label: 'Dieta', Icon: Utensils },
} satisfies Record<Tab, { label: string; Icon: typeof Dumbbell }>

const tabIds = Object.keys(TABS) as Tab[]

export function BottomNav({ tab, onChange, alerts = {} }: { tab: Tab; onChange: (t: Tab) => void; alerts?: Partial<Record<Tab, string>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-(--z-nav) flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-md">
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
              <span className={cn('relative flex h-7.5 w-14 items-center justify-center rounded-full transition-colors duration-125', tab === id && 'bg-surface')}>
                <Icon size={20} aria-hidden="true" />
                {alerts[id] && <span aria-hidden="true" className="absolute top-1 right-3.5 size-2 rounded-full bg-info" />}
              </span>
              <span aria-hidden="true">{label}</span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
