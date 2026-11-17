import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { beep, remainingSec } from './restTimer'

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** totalSec: descanso do exercício marcado; sem ele (app reaberto) a barra parte do restante ao montar */
type Props = { endAt: number; totalSec?: number; onSkip: () => void; onAdd15: () => void; onFinish: () => void }

export function RestCard({ endAt, totalSec, onSkip, onAdd15, onFinish }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const seenRunning = useRef(false) // já estava contando? (montar com 0 limpa sem bipar)
  const left = remainingSec(endAt, now)
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
    onFinish()
  }, [left, onFinish])

  if (left <= 0) return null
  const pct = (left / Math.max(totalSec ?? initial, left)) * 100
  return (
    <div
      role="timer"
      aria-label="Descanso"
      className="fixed inset-x-4 bottom-[calc(136px+env(safe-area-inset-bottom))] z-10 flex items-center gap-2.5 rounded-[14px] border border-accent-line bg-surface py-1 pr-1 pl-3.5 shadow-[0_10px_30px_#000a]"
    >
      <Timer size={18} className="shrink-0 text-accent" aria-hidden="true" />
      <b className="text-[19px] font-bold text-accent tabular-nums">{mmss(left)}</b>
      <div className="h-1 flex-1 overflow-hidden rounded-sm bg-line"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
      <Button variant="outline" size="sm" onClick={onAdd15}>+15 s</Button>
      <Button variant="outline" size="sm" onClick={onSkip}>Pular</Button>
    </div>
  )
}
