import { useEffect } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { SessionExercise, SetDone } from '../types'

const round = (n: number) => Math.round(n * 10) / 10

type Props = { exercise: SessionExercise; onChange: (setIdx: number, f: (cur: SetDone) => SetDone) => void; onClose: () => void }

export function SetEditor({ exercise, onChange, onClose }: Props) {
  const done = exercise.sets.map((s, i) => [s, i] as const).filter(([s]) => s)
  const bumpReps = (i: number, d: number) => onChange(i, (s) => ({ ...s, reps: String(Math.max(1, (parseInt(s.reps, 10) || 0) + d)) }))
  const bumpKg = (i: number, d: number) => onChange(i, (s) => ({ ...s, weightKg: Math.max(0, round(s.weightKg + d)) }))
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Séries de ${exercise.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="row-actions">
          <h2 className="grow">{exercise.name}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        {done.length === 0 && <p className="muted-note">Marque uma série para editar.</p>}
        {done.map(([s, i]) => (
          <div key={i} className="row-actions set-edit">
            <span className="badge">{i + 1}</span>
            <div className="stepper" role="group" aria-label={`Reps da série ${i + 1}`}>
              <button type="button" className="icon-btn" aria-label={`Diminuir reps da série ${i + 1}`} onClick={() => bumpReps(i, -1)}><Minus size={16} aria-hidden="true" /></button>
              <span className="stepper-value">{s!.reps} reps</span>
              <button type="button" className="icon-btn" aria-label={`Aumentar reps da série ${i + 1}`} onClick={() => bumpReps(i, 1)}><Plus size={16} aria-hidden="true" /></button>
            </div>
            <div className="stepper" role="group" aria-label={`Carga da série ${i + 1}`}>
              <button type="button" className="icon-btn" aria-label={`Diminuir carga da série ${i + 1}`} onClick={() => bumpKg(i, -2.5)}><Minus size={16} aria-hidden="true" /></button>
              <span className="stepper-value">{String(s!.weightKg).replace('.', ',')} kg</span>
              <button type="button" className="icon-btn" aria-label={`Aumentar carga da série ${i + 1}`} onClick={() => bumpKg(i, 2.5)}><Plus size={16} aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
