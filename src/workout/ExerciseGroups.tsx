import type { ReactNode } from 'react'
import { imageUrl } from '@/catalog/catalog'
import { cn } from '@/lib/utils'
import { ExerciseIcon } from './ExerciseIcon'
import { groupExercises, type ExerciseShape } from './reps'

export function ExerciseGroups<T extends ExerciseShape>({ exercises, className, heading, row }: {
  exercises: T[]
  className?: (cardio: boolean) => string
  heading?: string
  row: (e: T, index: number, cardio: boolean) => ReactNode
}) {
  return groupExercises(exercises).map(({ cardio, items }) => items.length > 0 && (
    <div key={String(cardio)} className={className?.(cardio)}>
      {cardio && <div className={cn('label-section', heading)}>Cardio</div>}
      {items.map(({ exercise, index }) => row(exercise, index, cardio))}
    </div>
  ))
}

export function ExerciseThumb({ muscles, image, cardio }: { muscles: string[]; image?: string; cardio?: boolean }) {
  return (
    <span className="relative shrink-0">
      <ExerciseIcon muscles={muscles} cardio={cardio} size={36} />
      {image && <img key={image} src={imageUrl(image)} alt="" loading="lazy" className="absolute inset-0 size-9 rounded-lg bg-surface object-cover" onError={(event) => { event.currentTarget.hidden = true }} />}
    </span>
  )
}
