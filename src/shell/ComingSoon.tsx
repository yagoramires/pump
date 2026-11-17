import { TrendingUp, Utensils } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

const COPY = {
  Dieta: { icon: <Utensils size={30} aria-hidden="true" />, text: 'Cardápio do dia, água e o que você comeu de verdade. Por enquanto, foque no treino.' },
  Evolução: { icon: <TrendingUp size={30} aria-hidden="true" />, text: 'Peso, medidas e cargas por exercício. Por enquanto, foque no treino.' },
} as const

export function ComingSoon({ title }: { title: keyof typeof COPY }) {
  const { icon, text } = COPY[title]
  return (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[.05em] text-faint">{title}</div>
      <div className="mt-[14vh]">
        <EmptyState icon={icon} title={`${title} chega em breve`}>
          <p className="max-w-[220px] text-sm text-text-2">{text}</p>
        </EmptyState>
      </div>
    </>
  )
}
