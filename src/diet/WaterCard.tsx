import { useState } from 'react'
import { liters } from './display'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { waterMax } from './water'

export function WaterCard({ ml, goalMl, onChange }: { ml: number; goalMl: number; onChange: (ml: number) => void }) {
  const [drag, setDrag] = useState<number>()
  const live = drag ?? ml
  return (
    <Card className="gap-3">
      <div className="text-body font-semibold text-strong">{`Água · ${liters(live)} de ${liters(goalMl)} L`}</div>
      {/* o máximo usa o ml gravado, não o ao vivo, pra não mudar no meio do arraste */}
      <Slider
        min={0}
        step={100}
        max={waterMax(ml, goalMl)}
        value={[live]}
        onValueChange={([v]) => setDrag(v)}
        onValueCommit={([v]) => { onChange(v); setDrag(undefined) }}
        aria-label="Água de hoje"
        aria-valuetext={`${liters(live)} L`}
      />
    </Card>
  )
}
