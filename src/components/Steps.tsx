import { Progress } from '@/components/ui/progress'

export function Steps({ n, total }: { n: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Progress aria-hidden="true" value={(n / total) * 100} className="h-1 bg-line" />
      <div className="label-caps-wide">{`PASSO ${n} DE ${total}`}</div>
    </div>
  )
}
