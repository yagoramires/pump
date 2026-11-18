import { cn } from '@/lib/utils'

export function Steps({ n, total }: { n: number; total: number }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <span key={i} className={cn('h-1 flex-1 rounded-full', i < n ? 'bg-accent' : 'bg-line')} />)}
      </div>
      <div className="label-caps tracking-[0.08em]">{`PASSO ${n} DE ${total}`}</div>
    </div>
  )
}
