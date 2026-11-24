import { Card } from '@/components/ui/card'
import { formatDayMonth } from '@/lib/date'
import { formatKg } from '@/lib/number'
import type { Workout, WorkoutSession } from './types'
import { completedSessions, previousSets, sessionStats, suggestedKg } from './stats'
import { nthOccurrence } from './session'
import { isCardio } from './reps'
import { formatDuration } from './summary'
import { ExerciseThumb } from './ExerciseGroups'
import { useMuscleLevels } from './useMuscleLevels'
import { BodyMapCard } from './LazyBodyMap'
import { Stat } from './Stat'

export function WorkoutPreview({ workout, sessions, today }: { workout: Workout; sessions: WorkoutSession[]; today: string }) {
  const levels = useMuscleLevels(workout.exercises)
  const sets = workout.exercises.reduce((a, e) => a + e.sets, 0)
  const last = completedSessions(sessions).filter((s) => s.workoutId === workout.id && s.date < today).at(-1)
  const lastMinutes = last && sessionStats(last).minutes
  return (
    <>
      <div className="flex gap-2">
        <Stat value={String(workout.exercises.length)} label={workout.exercises.length === 1 ? 'Exercício' : 'Exercícios'} />
        <Stat value={String(sets)} label={sets === 1 ? 'Série' : 'Séries'} />
        {lastMinutes != null && <Stat value={formatDuration(lastMinutes)} label="Última vez" />}
      </div>
      {last && <p className="text-center text-meta text-text-2">{`Último treino ${workout.label} em ${formatDayMonth(last.date)}`}</p>}
      <BodyMapCard levels={levels} />
      <Card size="flush" className="gap-0"><WorkoutExercises workout={workout} sessions={sessions} today={today} /></Card>
    </>
  )
}

/** `today` exclusivo: a carga sugerida vem das sessões antes dele */
export function WorkoutExercises({ workout, sessions, today }: { workout: Workout; sessions: WorkoutSession[]; today: string }) {
  return workout.exercises.map((e, i) => {
    const cardio = isCardio(e)
    // a carga que a tela do treino já vai sugerir: a da última vez, ou a do plano
    const kg = suggestedKg(e, previousSets(sessions, today, e.exerciseId, nthOccurrence(workout.exercises, i)))
    return (
      <div key={i} className="flex items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0">
        <ExerciseThumb muscles={e.muscles} image={e.images[0]} cardio={cardio} />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold break-words text-strong">{e.name}</span>
          <span className="block text-meta text-text-2 tabular-nums">{cardio ? e.reps : `${e.sets} × ${e.reps}${kg > 0 ? ` · ${formatKg(kg)} kg` : ''}`}</span>
        </span>
      </div>
    )
  })
}
