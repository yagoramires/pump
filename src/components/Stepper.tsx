import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** − valor +; `children` troca o texto do meio (ex.: um campo editável) */
export function Stepper({ label, text, value, step, min, max, onChange, children }: { label: string; text?: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void; children?: ReactNode }) {
  const go = (d: number) => onChange(Math.round(clamp(value + d, min, max) * 10) / 10)
  return (
    <>
      <Button variant="outline" size="icon" className="touch-manipulation" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => go(-step)}><Minus /></Button>
      {children ?? <span className="min-w-14 text-center text-base font-semibold tabular-nums text-strong">{text}</span>}
      <Button variant="outline" size="icon" className="touch-manipulation" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => go(step)}><Plus /></Button>
    </>
  )
}
