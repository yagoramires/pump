import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { NumberField } from '@/components/NumberField'
import { cn } from '@/lib/utils'

const FIELD = 'h-11 border-transparent bg-transparent px-1 text-center font-semibold tabular-nums focus-visible:bg-surface'

function Frame({ unit, children }: { unit?: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center rounded-md bg-panel pr-2">
      {children}
      {unit && <span className="text-caption text-text-2">{unit}</span>}
    </label>
  )
}

export function PillNumber({ unit, className, ...props }: ComponentProps<typeof NumberField> & { unit?: string }) {
  return <Frame unit={unit}><NumberField className={cn(FIELD, className)} autoComplete="off" enterKeyHint="done" {...props} /></Frame>
}

export function PillText({ unit, className, ...props }: ComponentProps<typeof Input> & { unit?: string }) {
  return <Frame unit={unit}><Input className={cn(FIELD, className)} autoComplete="off" {...props} /></Frame>
}
