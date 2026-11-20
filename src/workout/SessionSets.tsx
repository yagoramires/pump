import { formatKg } from '@/lib/number'
import type { WorkoutSession } from './types'
import { isCardio } from './reps'
import { markedSets } from './session'

/** séries feitas de cada exercício; exercício sem série marcada não aparece */
export function SessionSets({ session }: { session: WorkoutSession }) {
  return session.exercises.map((e, i) => {
    const done = markedSets(e)
    if (done.length === 0) return null
    return (
      <div key={i}>
        <div className="text-sm font-semibold text-strong">{e.name}</div>
        {isCardio(e) ? <div className="text-meta text-text-2">feito</div> : done.map((d, j) => <div key={j} className="text-meta text-text-2 tabular-nums">{`${formatKg(d.weightKg)} kg × ${d.reps}`}</div>)}
      </div>
    )
  })
}
