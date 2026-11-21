import { useEffect, useState } from 'react'
import type { WaterSettings } from './types'
import { liters } from './display'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { waterMax } from './water'

export function WaterCard({ ml, settings, onChange }: { ml: number; settings: WaterSettings; onChange: (ml: number) => void }) {
  const [live, setLive] = useState(ml)
  useEffect(() => setLive(ml), [ml])
  return (
    <Card className="gap-3">
      <div className="text-body font-semibold text-strong">{`Água · ${liters(live)} de ${liters(settings.goalMl)} L`}</div>
      {/* o máximo usa o ml gravado, não o ao vivo, pra não mudar no meio do arraste */}
      <Slider
        min={0}
        step={100}
        max={waterMax(ml, settings.goalMl)}
        value={[live]}
        onValueChange={([v]) => setLive(v)}
        onValueCommit={([v]) => onChange(v)}
        aria-label="Água de hoje"
        aria-valuetext={`${liters(live)} L`}
      />
    </Card>
  )
}
