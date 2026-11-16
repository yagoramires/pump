import { useEffect, useRef, useState } from 'react'
import { beep, remainingSec } from './restTimer'

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

type Props = { endsAt: number; onSkip: () => void; onAdd: () => void; onFinish: () => void }

export function RestBanner({ endsAt, onSkip, onAdd, onFinish }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const seenRunning = useRef(false) // já estava contando? (montar com 0 limpa sem bipar)
  const left = remainingSec(endsAt, now)

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
  return (
    <div className="rest-banner" role="timer" aria-label="Descanso">
      <span className="rest-label">Descanso</span>
      <span className="rest-time">{mmss(left)}</span>
      <button type="button" className="btn ghost" onClick={onAdd}>+15 s</button>
      <button type="button" className="btn" onClick={onSkip}>Pular</button>
    </div>
  )
}
