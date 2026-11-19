import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Toggle } from '@/components/ui/toggle'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const pad = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h))
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5))

type Props = {
  id?: string
  /** HH:MM */
  value?: string
  onChange: (v: string | undefined) => void
  placeholder?: string
  'aria-label'?: string
  /** mostra "Limpar" (o valor volta a `undefined`) */
  clearable?: boolean
  className?: string
}

export function TimePicker({ id, value, onChange, placeholder = '--:--', 'aria-label': ariaLabel, clearable, className }: Props) {
  const [open, setOpen] = useState(false)
  const [hh, mm] = value?.match(/^(\d{2}):(\d{2})$/)?.slice(1) ?? []
  // shortcut: só horas/minutos "redondos" na lista; o minuto atual entra se fugir do passo de 5
  const minutes = mm && !MINUTES.includes(mm) ? [...MINUTES, mm].sort() : MINUTES
  const column = (label: string, items: string[], current: string | undefined, unit: string, pick: (v: string) => void) => (
    <ScrollArea className="h-56 flex-1">
      <div role="group" aria-label={label} className="flex flex-col gap-1 pr-2">
        {items.map((v) => (
          <Toggle key={v} ref={(el) => { if (v === current) el?.scrollIntoView?.({ block: 'center' }) }} size="lg" pressed={v === current} aria-label={`${v} ${unit}`} onPressedChange={() => pick(v)}>{v}</Toggle>
        ))}
      </div>
    </ScrollArea>
  )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" aria-label={ariaLabel} className={cn('w-full justify-start tabular-nums', !value && 'text-muted-foreground', className)}>
          <Clock aria-hidden="true" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2">
        <div className="flex gap-2">
          {column('Horas', HOURS, hh, 'h', (h) => onChange(`${h}:${mm ?? '00'}`))}
          {column('Minutos', minutes, mm, 'min', (m) => { onChange(`${hh ?? '00'}:${m}`); setOpen(false) })}
        </div>
        {clearable && value && <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={() => { onChange(undefined); setOpen(false) }}>Limpar</Button>}
      </PopoverContent>
    </Popover>
  )
}
