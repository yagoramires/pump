import { Dumbbell, TrendingUp, Utensils } from 'lucide-react'
import type { Tab } from '../types'

const TABS = [
  { id: 'treino', label: 'Treino', Icon: Dumbbell },
  { id: 'evolucao', label: 'Evolução', Icon: TrendingUp },
  { id: 'dieta', label: 'Dieta', Icon: Utensils },
] as const

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={20} aria-hidden="true" />
          {tab === id && <span>{label}</span>}
        </button>
      ))}
    </nav>
  )
}
