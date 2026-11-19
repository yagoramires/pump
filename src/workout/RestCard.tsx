import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipForward, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Chips } from '@/components/Chips'
import { SheetBody } from '@/components/SheetRow'
import { beep } from './restTimer'
import { restRemainingSeconds, type ActiveRest } from './session'
import { restClock, restSecondsLabel } from './display'
import { REST_CHOICES, REST_STEP } from './limits'

const DURATIONS = Object.fromEntries(REST_CHOICES.map((sec) => [String(sec), sec < 120 ? restSecondsLabel(sec) : `${sec / 60} min`]))

type Props = {
  timer: ActiveRest
  totalSec?: number
  restSec: number
  onExtend: () => void
  onDone: () => void
  onTogglePause: () => void
  onPickDuration: () => void
}

export function RestCard({ timer, totalSec, restSec, onExtend, onDone, onTogglePause, onPickDuration }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const seenRunning = useRef(false)
  const left = restRemainingSeconds(timer, now)
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
        <Button variant="ghost" size="icon-sm" aria-label="Definir tempo de descanso" className="text-accent" onClick={onPickDuration}>
          <Timer aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <b className="text-title leading-none font-bold text-accent tabular-nums">{restClock(left, true)}</b>
            <span className="text-caption text-text-2 tabular-nums">de {restClock(restSec)}</span>
          </div>
          <Progress value={pct} aria-label="Descanso restante" className="h-1 bg-line" />
        </div>
        <Button variant="outline" size="icon-sm" aria-label={timer.paused ? 'Continuar descanso' : 'Pausar descanso'} onClick={onTogglePause}>
          {timer.paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
        <Button variant="outline" size="icon-sm" className="w-auto px-2 text-xs" onClick={onExtend}>{`+${restSecondsLabel(REST_STEP)}`}</Button>
        <Button variant="outline" size="icon-sm" aria-label="Pular descanso" onClick={onDone}><SkipForward aria-hidden="true" /></Button>
      </div>
    </Card>
  )
}

/** fora da RestCard: ela some quando a contagem zera e levaria o seletor aberto junto */
export function RestPicker({ open, restSec, onClose, onPick }: { open: boolean; restSec: number; onClose: () => void; onPick: (sec: number) => void }) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="shrink-0 pb-1 text-title font-semibold text-strong">Tempo de descanso</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Vale pra este exercício, agora e nos próximos treinos.</DrawerDescription>
          {/* Tocar no tempo selecionado reinicia a contagem com o mesmo valor. */}
          <Chips label="Tempo" options={DURATIONS} value={String(restSec)} cols="grid-cols-4" onChange={(v) => { onPick(v === undefined ? restSec : Number(v)); onClose() }} />
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
