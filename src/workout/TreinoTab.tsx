import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronRight, Dumbbell, HeartPulse, Moon, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SetDone, WorkoutLog, WorkoutSession } from './types'
import { usePersisted } from '@/storage/db'
import { formatDayLabel } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { formatKg, plural } from '@/lib/number'
import { IconDot } from '@/components/IconDot'
import { cn } from '@/lib/utils'
import { PlanEditor } from './PlanEditor'
import { Overlay } from '@/components/Overlay'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePreview } from './ExercisePreview'
import { SetTable } from './SetTable'
import { RestCard } from './RestCard'
import { workoutForDate } from './schedule'
import { completeSession, setDone, startSession } from './session'
import { previousSets, sessionStats } from './stats'
import { isRest, restRecord } from './rest'
import { unlockAudio } from './restTimer'
import { isCardio } from './cardio'

const firstIncomplete = (s: WorkoutSession): number => s.exercises.findIndex((e) => !isCardio(e) && e.sets.includes(null))

export function TreinoTab() {
  const clock = useToday()
  const [today, setToday] = useState(clock.today) // treino que passa da meia-noite segue no mesmo dia
  const [seenAt, setSeenAt] = useState(clock.now)
  const [plan, setPlan] = usePersisted('workoutPlan')
  const [log, setLog] = usePersisted('workoutLog')
  const [chosenId, setChosenId] = useState<string>()
  const [editingPlan, setEditingPlan] = useState(false)
  const [preview, setPreview] = useState<number>()
  const [openIdx, setOpenIdx] = useState<'auto' | number | null>('auto')
  const [restTotal, setRestTotal] = useState<number>()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // voltou do segundo plano: troca de dia, menos com treino em andamento
  if (seenAt !== clock.now) {
    setSeenAt(clock.now)
    const s = log[today]
    if (clock.today !== today && !(s && !s.completedAt && !isRest(s))) {
      setToday(clock.today)
      setChosenId(undefined)
      setOpenIdx('auto')
    }
  }

  const rest = isRest(log[today])
  const session = rest ? undefined : log[today]
  const workout = plan.workouts.find((w) => w.id === chosenId) ?? workoutForDate(plan, today)

  const patch = useCallback(
    (f: (s: NonNullable<typeof session>) => NonNullable<typeof session>) =>
      setLog((prev) => {
        const s = prev[today]
        return s && !isRest(s) ? { ...prev, [today]: f(s) } : prev
      }),
    [setLog, today],
  )
  const finishRest = useCallback(() => patch((s) => (s.restEndsAt === undefined ? s : { ...s, restEndsAt: undefined })), [patch])
  const closePreview = useCallback(() => setPreview(undefined), [])

  if (editingPlan) return <Overlay><PlanEditor initial={plan} onSave={(p) => { setPlan(p); setEditingPlan(false) }} onCancel={() => setEditingPlan(false)} /></Overlay>
  if (plan.workouts.length === 0) {
    return (
      <EmptyState icon={<Dumbbell size={30} aria-hidden="true" />} title="Nenhum treino montado">
        <p className="max-w-[260px] text-sm text-text-2">Monte seu treino pra começar a marcar as séries.</p>
        <Button className="mt-2 w-full max-w-xs" onClick={() => setEditingPlan(true)}>Montar treino</Button>
      </EmptyState>
    )
  }

  const undoRest = () =>
    setLog((prev) => {
      if (!isRest(prev[today])) return prev
      const { [today]: _gone, ...others } = prev
      return others
    })

  if ((rest && !chosenId) || (!session && !workout)) {
    return (
      <div>
        <div className="label-caps">{formatDayLabel(today)}</div>
        {rest ? (
          <EmptyState icon={<Moon size={30} aria-hidden="true" />} title="Descanso marcado">
            <p className="max-w-[260px] text-sm text-text-2">Hoje é dia de recuperar. Quer treinar mesmo assim?</p>
            <Button variant="outline" className="h-11 rounded-[13px]" onClick={undoRest}><Undo2 aria-hidden="true" /> Desfazer</Button>
          </EmptyState>
        ) : (
          <EmptyState icon={<Moon size={30} aria-hidden="true" />} title="Dia de descanso">
            <p className="max-w-[260px] text-sm text-text-2">Seu plano não tem treino hoje. Quer treinar mesmo assim?</p>
          </EmptyState>
        )}
        <div className="label-caps mx-0.5 mb-1.5">Escolher um treino</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
          {plan.workouts.map((w) => (
            <button key={w.id} type="button" onClick={() => setChosenId(w.id)} className="flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent-line bg-accent-bg text-sm font-bold text-accent">{w.label}</span>
              <span className="block min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-strong">{w.name}</span>
                <span className="block text-[13px] text-text-2">{plural(w.exercises.length, 'exercício', 'exercícios')}</span>
              </span>
              <ChevronRight size={16} className="text-faint" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  const view = session ?? startSession(workout!, today)
  const stats = sessionStats(view, now)
  const minutes = session ? stats.minutes : null
  const open = openIdx === 'auto' ? firstIncomplete(view) : openIdx
  const current = (prev: WorkoutLog) => {
    const s = prev[today]
    return s && !isRest(s) ? s : startSession(workout!, today)
  }
  const markRest = () => {
    setLog((prev) => (prev[today] ? prev : { ...prev, [today]: restRecord(today) }))
    toast('Descanso marcado')
  }

  const check = (exIdx: number, setIdx: number, v: SetDone) => {
    unlockAudio() // dentro do toque: o iOS só libera áudio num gesto
    const restSec = view.exercises[exIdx].restSec
    const saved = setLog((prev) => {
      const s = current(prev)
      const marked = !s.exercises[exIdx].sets[setIdx]
      const next = setDone(s, exIdx, setIdx, marked ? v : null)
      return { ...prev, [today]: marked ? { ...next, restEndsAt: Date.now() + restSec * 1000 } : next }
    })
    if (!saved[today]?.exercises[exIdx].sets[setIdx]) return
    setRestTotal(restSec)
    if (view.exercises[exIdx].sets.every((d, j) => j === setIdx || d)) setOpenIdx('auto')
  }
  const toggleCardio = (exIdx: number) =>
    setLog((prev) => {
      const s = current(prev)
      const e = s.exercises[exIdx]
      return { ...prev, [today]: setDone(s, exIdx, 0, e.sets[0] ? null : { reps: e.reps, weightKg: 0 }) }
    })
  const edit = (exIdx: number, setIdx: number, p: Partial<SetDone>) =>
    patch((s) => {
      const cur = s.exercises[exIdx].sets[setIdx]
      return cur ? setDone(s, exIdx, setIdx, { ...cur, ...p }) : s
    })
  const conclude = () => {
    patch((s) => completeSession(s, new Date()))
    toast('Treino concluído', {
      action: { label: 'Desfazer', onClick: () => patch((s) => ({ ...s, completedAt: undefined })) },
    })
  }

  return (
    <div className="pb-24">
      <div className="label-caps">{`${formatDayLabel(today)} · TREINO ${view.workoutLabel}`}</div>
      <h1 className="mt-0.5 mb-3 text-[26px] font-bold tracking-tight text-strong">{view.workoutName}</h1>

      <div className="mb-2.5 flex items-center gap-3.5 rounded-[14px] border border-border bg-panel p-3.5">
        <div
          className="flex size-[72px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--color-accent) 0 ${stats.total ? (stats.done / stats.total) * 100 : 0}%, var(--color-line) 0)` }}
        >
          <div className="flex size-[58px] flex-col items-center justify-center rounded-full bg-panel">
            <span className="text-[15px] leading-none font-bold text-strong tabular-nums">{stats.done}/{stats.total}</span>
            <span className="mt-0.5 text-[10px] text-faint">séries</span>
          </div>
        </div>
        <div>
          <div className="text-[13px] text-text-2">Volume de hoje</div>
          <div className="mt-0.5 text-lg font-semibold text-strong tabular-nums">{`${formatKg(stats.volumeKg)} kg`}</div>
          <div className="mt-1 text-[13px] text-text-2">{minutes === null ? plural(view.exercises.length, 'exercício', 'exercícios') : `${minutes} min · ${plural(view.exercises.length, 'exercício', 'exercícios')}`}</div>
        </div>
      </div>
      {!log[today] && workoutForDate(plan, today) && (
        <Button variant="outline" className="mb-2.5 h-11 w-full rounded-[13px]" onClick={markRest}><Moon aria-hidden="true" /> Descansar hoje</Button>
      )}

      {view.exercises.map((e, i) => !isCardio(e) && (
        <ExerciseCard key={i} ex={e} open={open === i} onToggle={() => setOpenIdx(open === i ? null : i)} onPreview={() => setPreview(i)}>
          <SetTable ex={e} prev={previousSets(log, today, e.exerciseId)} onCheck={(j, v) => check(i, j, v)} onEdit={(j, p) => edit(i, j, p)} />
        </ExerciseCard>
      ))}
      {view.exercises.some(isCardio) && <div className="label-caps mt-4 mb-2">Cardio</div>}
      {view.exercises.map((e, i) => isCardio(e) && (
        <div key={i} className="mb-2.5 flex items-center gap-1.5 rounded-[14px] border border-border bg-panel py-1.5 pr-2 pl-1.5">
          <button type="button" aria-label={`Ver ${e.name}`} onClick={() => setPreview(i)} className="flex size-11 shrink-0 items-center justify-center">
            <IconDot color="var(--c1)" size={32}><HeartPulse size={16} aria-hidden="true" /></IconDot>
          </button>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold break-words text-strong">{e.name}</span>
            <span className="block text-[13px] text-text-2">{e.reps}</span>
          </span>
          <button type="button" aria-pressed={!!e.sets[0]} aria-label={`${e.name} feito`} onClick={() => toggleCardio(i)} className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl border', e.sets[0] ? 'border-accent bg-accent text-on-accent' : 'border-border text-faint')}>
            <Check size={18} aria-hidden="true" />
          </button>
        </div>
      ))}

      <div className="pointer-events-none fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      {session?.restEndsAt !== undefined && (
        <RestCard
          endAt={session.restEndsAt}
          totalSec={restTotal}
          onDone={finishRest}
          onAdd15={() => {
            patch((s) => ({ ...s, restEndsAt: (s.restEndsAt ?? Date.now()) + 15_000 }))
            setRestTotal((t) => t && t + 15)
          }}
        />
      )}
      <div className="fixed bottom-[calc(var(--nav-h)+12px+env(safe-area-inset-bottom))] left-1/2 z-(--z-bar) w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2">
        {session?.completedAt ? (
          <Button variant="secondary" className="h-11 w-full rounded-[13px] font-bold" disabled><Check aria-hidden="true" /> Treino concluído</Button>
        ) : (
          <Button className="h-11 w-full rounded-[13px] font-bold" disabled={!session} onClick={conclude}><Check aria-hidden="true" /> Concluir treino</Button>
        )}
      </div>
      {preview !== undefined && <ExercisePreview exercise={view.exercises[preview]} onClose={closePreview} />}
    </div>
  )
}
