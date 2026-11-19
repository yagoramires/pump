import type { ReactNode } from 'react'
import { Progress } from '@/components/ui/progress'

export function Steps({ n, total, action }: { n: number; total: number; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Progress aria-hidden="true" value={(n / total) * 100} className="h-1 bg-line" />
      <div className="flex items-center justify-between gap-3">
        <div className="label-caps tracking-[0.08em]">{`PASSO ${n} DE ${total}`}</div>
        {action}
      </div>
    </div>
  )
}
