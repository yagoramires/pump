import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { SetDone, WorkoutLog, WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { formatDayLabel, todayKey } from '../lib/date'
import { Toast } from '../shell/Toast'
import { PlanEditor } from './PlanEditor'
import { ExerciseRow } from './ExerciseRow'
import { ExercisePreview } from './ExercisePreview'
import { SetEditor } from './SetEditor'
import { RestBanner } from './RestBanner'
import { workoutForDate } from './schedule'
import { completeSession, setDone, setRestEnd, startSession } from './session'
import { unlockAudio } from './restTimer'

const EMPTY_PLAN: WorkoutPlan = { workouts: [] }
const EMPTY_LOG: WorkoutLog = {}

export function TreinoTab() {
  const [today] = useState(() => todayKey()) // fixo: treino que passa da meia-noite segue no mesmo dia
  const [plan, , planLoaded] = usePersisted('workoutPlan', EMPTY_PLAN)
  const [log, setLog, logLoaded] = usePersisted('workoutLog', EMPTY_LOG)
  const [chosenId, setChosenId] = useState<string>()
  const [editingPlan, setEditingPlan] = useState(false)
  const [preview, setPreview] = useState<number>()
  const [editing, setEditing] = useState<number>()
  const [toast, setToast] = useState<string>()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(undefined), 2000)
    return () => clearTimeout(id)
  }, [toast])

  const session = log[today]
  const workout = plan.workouts.find((w) => w.id === chosenId) ?? workoutForDate(plan, today)

  // mesma gravação sempre via updater: toques rápidos não perdem atualização
  const patch = useCallback(
    (f: (s: NonNullable<typeof session>) => NonNullable<typeof session>) =>
      setLog((prev) => {
        const s = prev[today]
        return s ? { ...prev, [today]: f(s) } : prev
      }),
    [setLog, today],
  )
  const finishRest = useCallback(() => patch((s) => (s.restEndsAt === undefined ? s : setRestEnd(s, undefined))), [patch])

  if (!planLoaded || !logLoaded) return <p className="muted-note">Carregando…</p>

  if (editingPlan || plan.workouts.length === 0) {
    if (!editingPlan)
      return (
        <div className="stack">
          <h1>Treino</h1>
          <p className="muted-note">Você ainda não tem um treino montado.</p>
          <button type="button" className="btn" onClick={() => setEditingPlan(true)}>Montar treino</button>
        </div>
      )
    return <PlanEditor onDone={() => setEditingPlan(false)} onCancel={() => setEditingPlan(false)} />
  }

  if (!session && !workout) {
    return (
      <div className="stack">
        <h1>Dia de descanso</h1>
        <p className="muted-note">Quer treinar mesmo assim? Escolha um treino.</p>
        {plan.workouts.map((w) => (
          <button key={w.id} type="button" className="btn ghost" onClick={() => setChosenId(w.id)}>
            Treino {w.label} · {w.name}
          </button>
        ))}
      </div>
    )
  }

  const view = session ?? startSession(workout!, today)
  const toggle = (exIdx: number, setIdx: number) => {
    unlockAudio() // dentro do toque: o iOS só libera áudio num gesto
    setLog((prev) => {
      const s = prev[today] ?? startSession(workout!, today)
      const e = s.exercises[exIdx]
      if (e.sets[setIdx]) return { ...prev, [today]: setDone(s, exIdx, setIdx, null) }
      const marked = setDone(s, exIdx, setIdx, { reps: e.reps, weightKg: e.weightKg })
      return { ...prev, [today]: setRestEnd(marked, Date.now() + e.restSec * 1000) }
    })
  }
  const edit = (exIdx: number, setIdx: number, v: SetDone) => patch((s) => setDone(s, exIdx, setIdx, v))
  const conclude = () => {
    patch((s) => completeSession(s, new Date()))
    setToast('Treino concluído')
  }

  return (
    <div className="stack">
      <div>
        <div className="day-label">{`${formatDayLabel(today)} · TREINO ${view.workoutLabel}`}</div>
        <h1>{view.workoutName}</h1>
      </div>
      {view.exercises.map((e, i) => (
        <ExerciseRow key={i} exercise={e} onPreview={() => setPreview(i)} onEdit={() => setEditing(i)} onToggle={(j) => toggle(i, j)} />
      ))}
      {session?.completedAt ? (
        <button type="button" className="btn" disabled><Check size={18} aria-hidden="true" /> Treino concluído</button>
      ) : (
        <button type="button" className="btn" disabled={!session} onClick={conclude}>Concluir treino</button>
      )}
      {session?.restEndsAt !== undefined && (
        <RestBanner
          endsAt={session.restEndsAt}
          onSkip={finishRest}
          onAdd={() => patch((s) => setRestEnd(s, (s.restEndsAt ?? Date.now()) + 15_000))}
          onFinish={finishRest}
        />
      )}
      {preview !== undefined && <ExercisePreview exercise={view.exercises[preview]} onClose={() => setPreview(undefined)} />}
      {editing !== undefined && <SetEditor exercise={view.exercises[editing]} onChange={(j, v) => edit(editing, j, v)} onClose={() => setEditing(undefined)} />}
      {toast && <Toast message={toast} />}
    </div>
  )
}
