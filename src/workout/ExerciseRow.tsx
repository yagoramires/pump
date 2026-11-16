import { Dumbbell, Pencil } from 'lucide-react'
import type { SessionExercise } from '../types'
import { imageUrl } from '../catalog/catalog'

type Props = { exercise: SessionExercise; onPreview: () => void; onEdit: () => void; onToggle: (setIdx: number) => void }

export function ExerciseRow({ exercise: e, onPreview, onEdit, onToggle }: Props) {
  return (
    <div className="card ex-card">
      <div className="row-actions">
        <button type="button" className="thumb" aria-label={`Ver ${e.name}`} onClick={onPreview}>
          {e.images[0] ? <img src={imageUrl(e.images[0])} alt="" /> : <Dumbbell size={20} aria-hidden="true" />}
        </button>
        <div className="grow">
          <span className="name">{e.name}</span>
          <span className="muted">{`${e.sets.length} × ${e.reps} · ${String(e.weightKg).replace('.', ',')} kg`}</span>
        </div>
        <button type="button" className="icon-btn" aria-label={`Editar séries de ${e.name}`} onClick={onEdit}><Pencil size={18} aria-hidden="true" /></button>
      </div>
      <div className="dashes">
        {e.sets.map((s, i) => (
          <button key={i} type="button" className="dash-btn" aria-label={`Série ${i + 1} de ${e.name}`} aria-pressed={s !== null} onClick={() => onToggle(i)}>
            <span className="dash" />
          </button>
        ))}
      </div>
    </div>
  )
}
