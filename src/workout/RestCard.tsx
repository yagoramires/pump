import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipForward, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Chips } from '@/components/Chips'
import { SheetBody } from '@/components/SheetRow'
import { beep, remainingSec } from './restTimer'

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const ms = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const DURATIONS = { '30': '30 s', '45': '45 s', '60': '60 s', '90': '90 s', '120': '2 min', '180': '3 min', '300': '5 min' }

/** totalSec: descanso do exercício marcado; sem ele (app reaberto) a barra parte do restante ao montar. restSec: tempo configurado do exercício */
type Props = {
  endAt?: number
  pausedLeftMs?: number
  totalSec?: number
  restSec: number
  onAdd15: () => void
  onDone: () => void
  onTogglePause: () => void
  onPickDuration: (sec: number) => void
}

export function RestCard({ endAt, pausedLeftMs, totalSec, restSec, onAdd15, onDone, onTogglePause, onPickDuration }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [picking, setPicking] = useState(false)
  const seenRunning = useRef(false)
  const paused = pausedLeftMs !== undefined
  const left = paused ? remainingSec(pausedLeftMs, 0) : remainingSec(endAt ?? 0, now)
  const [initial] = useState(left)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (left > 0) {
      seenRunning.current = true
      return
    }
    if (seenRunning.current) beep()
    seenRunning.current = false
    onDone()
  }, [left, onDone])

  if (left <= 0) return null
  const pct = (left / Math.max(totalSec ?? initial, left)) * 100
  // em cima do botão Concluir do Treino (12px + 44px + 12px acima da barra de abas)
  return (
    <Card
      role="timer"
      aria-label="Descanso"
      className="fixed bottom-[calc(var(--nav-h)+68px+env(safe-area-inset-bottom))] left-1/2 z-(--z-bar) w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2 border-accent-line bg-surface p-1.5 shadow-lg"
    >
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon-sm" aria-label="Definir tempo de descanso" className="text-accent" onClick={() => setPicking(true)}>
          <Timer aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <b className="text-title leading-none font-bold text-accent tabular-nums">{mmss(left)}</b>
            <span className="text-caption text-text-2 tabular-nums">de {ms(restSec)}</span>
          </div>
          <Progress value={pct} aria-label="Descanso restante" className="h-1 bg-line" />
        </div>
        <Button variant="outline" size="icon-sm" aria-label={paused ? 'Continuar descanso' : 'Pausar descanso'} onClick={onTogglePause}>
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
        <Button variant="outline" size="icon-sm" className="w-auto px-2 text-xs" onClick={onAdd15}>+15 s</Button>
        <Button variant="outline" size="icon-sm" aria-label="Pular descanso" onClick={onDone}><SkipForward aria-hidden="true" /></Button>
      </div>
      <Drawer open={picking} onOpenChange={setPicking}>
        <DrawerContent>
          <SheetBody>
            <DrawerTitle className="shrink-0 pb-1 text-title font-semibold text-strong">Tempo de descanso</DrawerTitle>
            <DrawerDescription className="pb-3 text-meta text-text-2">Vale pra este exercício, agora e nos próximos treinos.</DrawerDescription>
            <Chips label="Tempo" options={DURATIONS} value={String(restSec)} cols="grid-cols-4" onChange={(v) => { if (v) { onPickDuration(Number(v)); setPicking(false) } }} />
          </SheetBody>
        </DrawerContent>
      </Drawer>
    </Card>
  )
}
