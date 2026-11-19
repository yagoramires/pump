import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { p2 } from '@/lib/date'

const HOURS = Array.from({ length: 24 }, (_, h) => p2(h))
const MINUTES = Array.from({ length: 12 }, (_, i) => p2(i * 5))

/** uma coluna = um grupo vertical (setas navegam, uma parada de Tab); ao abrir o popover rola até o valor atual */
function Column({ title, label, items, current, unit, pick }: { title: string; label: string; items: string[]; current?: string; unit: string; pick: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // rola só a coluna: scrollIntoView arrastaria a página e os ancestrais junto
    const on = ref.current?.querySelector<HTMLElement>('[data-state=on]')
    const vp = ref.current?.closest<HTMLElement>('[data-slot=scroll-area-viewport]')
    if (!on || !vp) return
    const o = on.getBoundingClientRect()
    vp.scrollTop = o.top - vp.getBoundingClientRect().top + vp.scrollTop - (vp.clientHeight - o.height) / 2
  }, [])
  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="label-caps text-center">{title}</span>
      <ScrollArea className="h-56">
        <ToggleGroup ref={ref} type="single" orientation="vertical" spacing={1} aria-label={label} value={current ?? ''} onValueChange={(v) => v && pick(v)} className="w-full pr-2">
          {items.map((v) => <ToggleGroupItem key={v} value={v} aria-label={`${v} ${unit}`} className="h-11 w-full">{v}</ToggleGroupItem>)}
        </ToggleGroup>
      </ScrollArea>
    </div>
  )
}

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
  const [pendingMm, setPendingMm] = useState<string>() // minuto escolhido antes da hora: só vira valor quando a hora chegar
  const [hh, mm] = value?.match(/^(\d{2}):(\d{2})$/)?.slice(1) ?? []
  // shortcut: só horas/minutos "redondos" na lista; o minuto atual entra se fugir do passo de 5
  const minutes = mm && !MINUTES.includes(mm) ? [...MINUTES, mm].sort() : MINUTES
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPendingMm(undefined) }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" aria-label={ariaLabel && `${ariaLabel}: ${value || 'sem horário'}`} className={cn('w-full justify-start tabular-nums', !value && 'text-muted-foreground', className)}>
          <Clock aria-hidden="true" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2">
        <div className="flex gap-2">
          <Column title="Hora" label="Horas" items={HOURS} current={hh} unit="h" pick={(h) => { onChange(`${h}:${mm ?? pendingMm ?? '00'}`); if (pendingMm) { setPendingMm(undefined); setOpen(false) } }} />
          <Column title="Min" label="Minutos" items={minutes} current={mm ?? pendingMm} unit="min" pick={(m) => { if (hh) { onChange(`${hh}:${m}`); setOpen(false) } else setPendingMm(m) }} />
        </div>
        {clearable && value && <Button type="button" variant="link" size="sm" className="mt-2 w-full" onClick={() => { onChange(undefined); setOpen(false) }}>Limpar</Button>}
      </PopoverContent>
    </Popover>
  )
}
