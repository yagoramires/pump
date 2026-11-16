import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { SessionExercise } from '../types'
import { imageUrl } from '../catalog/catalog'

export function ExercisePreview({ exercise, onClose }: { exercise: SessionExercise; onClose: () => void }) {
  const [frame, setFrame] = useState(0)
  const { images } = exercise
  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => setFrame((f) => (f + 1) % 2), 1000)
    return () => clearInterval(id)
  }, [images.length])

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={exercise.name} onClick={(e) => e.stopPropagation()}>
        <div className="row-actions">
          <h2 className="grow">{exercise.name}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        {images.length > 0 && <img className="preview-img" src={imageUrl(images[frame % images.length])} alt={exercise.name} />}
        <ol className="instructions">
          {exercise.instructions.filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
        </ol>
        {exercise.note && <p className="muted-note">{exercise.note}</p>}
      </div>
    </div>
  )
}
