import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Stat({ value, label, onClick }: { value: string; label: string; onClick?: () => void }) {
  const card = (
    <Card className="flex-1 items-center gap-0.5 px-2.5 py-3 text-center">
      <div className="text-title font-bold text-strong tabular-nums">{value}</div>
      <div className="text-caption font-semibold text-text-2">{label}</div>
    </Card>
  )
  return onClick ? <Button variant="ghost" onClick={onClick} className="h-auto flex-1 p-0 whitespace-normal hover:bg-transparent">{card}</Button> : card
}
