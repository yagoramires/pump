import { useId } from 'react'
import { Pill } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { supplementSub } from './supplements'
import { useSupplements } from './useSupplements'

export function SupplementsCard() {
  const { list, taken, toggle } = useSupplements()
  const titleId = useId()
  if (!list.length) return null
  const done = list.filter((s) => taken.includes(s.id)).length
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 px-0.5 pt-1.5 text-meta text-text-2">
        <Pill size={14} className="text-c4" aria-hidden="true" />
        <h2 id={titleId} className="font-semibold">Suplementos</h2>
        <span className="ml-auto tabular-nums text-text">{`${done} de ${list.length}`}</span>
      </div>
      <Card size="flush">
        <ul>
          {list.map((s) => {
            const sub = supplementSub(s)
            return (
              <li key={s.id} className="flex min-h-14 items-center gap-2 border-t border-line px-3.5 py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-strong">{s.name}</span>
                  {sub && <span className="block truncate text-caption text-text-2">{sub}</span>}
                </span>
                <Checkbox size="check" shape="round" checked={taken.includes(s.id)} aria-label={`${s.name} tomado`} onCheckedChange={() => toggle(s.id)} />
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
