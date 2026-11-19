import { Dumbbell, HeartPulse } from 'lucide-react'
import { IconDot } from '@/components/IconDot'
import { muscleColor } from '@/catalog/muscles'

export function ExerciseIcon({ muscles, cardio = false, size }: {
  muscles: string[]
  cardio?: boolean
  size: 32 | 36
}) {
  const Icon = cardio ? HeartPulse : Dumbbell
  return <IconDot color={cardio ? 'var(--c1)' : muscleColor(muscles)} size={size}><Icon size={16} aria-hidden="true" /></IconDot>
}
