import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, Check, ChevronRight, Dumbbell, HeartPulse, History, Moon, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SetDone, WorkoutLog, WorkoutSession } from './types'
import { usePersisted } from '@/storage/db'
import { formatDayLabel } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { EmptyState } from '@/components/EmptyState'
import { formatKg, plural } from '@/lib/number'
import { IconDot } from '@/components/IconDot'
import { PlanEditor } from './PlanEditor'
import { Overlay } from '@/components/Overlay'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePreview } from './ExercisePreview'
import { SetTable } from './SetTable'
import { RestCard } from './RestCard'
import { nextWorkout, unfinishedSession } from './schedule'
import { completeSession, setDone, startSession } from './session'
import { previousSets, sessionStats } from './stats'
import { isRest, restRecord } from './rest'
import { unlockAudio } from './restTimer'
import { PLAN_DEFAULTS } from './exercises'
import { isCardio } from './cardio'
import { UnfinishedCard } from './UnfinishedCard'
import { SwitchWorkout } from './SwitchWorkout'
import { PastWorkouts } from './PastWorkouts'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Workout } from './types'

const MIDNIGHT_HOLD_HOURS = 6
const firstIncomplete = (s: WorkoutSession): number => s.exercises.findIndex((e) => !isCardio(e) && e.sets.includes(null))

export function TreinoTab() {
  const clock = useToday()
  const [today, setToday] = useState(clock.today) // treino que passa da meia-noite segue no mesmo dia
  const [seenAt, setSeenAt] = useState(clock.now)
  const [plan, setPlan] = usePersisted('workoutPlan')
  const [log, setLog] = usePersisted('workoutLog')
  const [chosenId, setChosenId] = useState<string>()
  const [editingPlan, setEditingPlan] = useState(false)
  const [switching, setSwitching] = useState<'list' | Workout>()
  const [pastOpen, setPastOpen] = useState(false)
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
    // só segura o dia com treino de verdade (série marcada) e recente
    const holds = s && !s.completedAt && !isRest(s) && s.exercises.some((e) => e.sets.some(Boolean)) && clock.now.getTime() - Date.parse(s.startedAt ?? '') < MIDNIGHT_HOLD_HOURS * 3_600_000
    if (clock.today !== today && !holds) {
      setToday(clock.today)
      setChosenId(undefined)
      setOpenIdx('auto')
    }
  }

  const rest = isRest(log[today])
  const session = rest ? undefined : log[today]
  const next = nextWorkout(plan, log)
  const workout = plan.workouts.find((w) => w.id === chosenId) ?? next
  const unfinished = unfinishedSession(log, today)

  const patch = useCallback(
    (f: (s: NonNullable<typeof session>) => NonNullable<typeof session>) =>
      setLog((prev) => {
        const s = prev[today]
        return s && !isRest(s) ? { ...prev, [today]: f(s) } : prev
      }),
    [setLog, today],
  )
  const finishRest = useCallback(
    () => patch((s) => (s.restEndsAt === undefined && s.restPausedLeftMs === undefined ? s : { ...s, restEndsAt: undefined, restPausedLeftMs: undefined, restExIdx: undefined })),
    [patch],
  )
  const closePreview = useCallback(() => setPreview(undefined), [])

  const pastLink = <Button variant="ghost" size="sm" className="-mr-2.5 text-accent" onClick={() => setPastOpen(true)}><History aria-hidden="true" /> Treinos anteriores</Button>
  if (pastOpen) return <Overlay><PastWorkouts onClose={() => setPastOpen(false)} /></Overlay>
  if (editingPlan) return <Overlay><PlanEditor initial={plan} onSave={(p) => { setPlan(p); setEditingPlan(false) }} onCancel={() => setEditingPlan(false)} /></Overlay>
  if (plan.workouts.length === 0) {
    return (
      <EmptyState icon={<Dumbbell size={30} aria-hidden="true" />} title="Nenhum treino montado">
        <p className="max-w-[260px] text-sm text-text-2">Monte seu treino pra começar a marcar as séries.</p>
        <Button className="w-full max-w-xs" onClick={() => setEditingPlan(true)}>Montar treino</Button>
      </EmptyState>
    )
  }

  const undoRest = () =>
    setLog((prev) => {
      if (!isRest(prev[today])) return prev
      const { [today]: _gone, ...others } = prev
      return others
    })

  if (rest && !chosenId) {
    return (
      <div className="flex flex-col gap-2.5">
        {unfinished && <UnfinishedCard session={unfinished} setLog={setLog} />}
        <div className="flex items-center justify-between"><div className="label-caps">{formatDayLabel(today)}</div>{pastLink}</div>
        <EmptyState icon={<Moon size={30} aria-hidden="true" />} title="Descanso marcado">
          <p className="max-w-[260px] text-sm text-text-2">Hoje é dia de recuperar. Quer treinar mesmo assim?</p>
          <Button variant="outline"  onClick={undoRest}><Undo2 aria-hidden="true" /> Desfazer</Button>
        </EmptyState>
        <div className="label-caps">Escolher um treino</div>
        <Card className="overflow-hidden">
          {plan.workouts.map((w) => (
            <Button key={w.id} variant="ghost" onClick={() => setChosenId(w.id)} className="h-auto min-h-14 w-full justify-start gap-3 rounded-none border-t border-line px-3.5 py-2.5 text-left font-normal first:border-t-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent-line bg-accent-bg text-sm font-bold text-accent">{w.label}</span>
              <span className="block min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-strong">{w.name}</span>
                <span className="block text-[13px] text-text-2">{plural(w.exercises.length, 'exercício', 'exercícios')}</span>
              </span>
              <ChevronRight size={16} className="text-faint" aria-hidden="true" />
            </Button>
          ))}
        </Card>
      </div>
    )
  }

  const view = session ?? startSession(workout!, today)
  const stats = sessionStats(view, now)
  const minutes = session ? stats.minutes : null
  const restIdx = session?.restExIdx ?? Math.max(0, firstIncomplete(view)) // sem restExIdx (sessão antiga) vale o próximo a fazer
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
      return { ...prev, [today]: marked ? { ...next, restEndsAt: Date.now() + restSec * 1000, restPausedLeftMs: undefined, restExIdx: exIdx } : next }
    })
    if (!saved[today]?.exercises[exIdx].sets[setIdx]) return
    setRestTotal(restSec)
    if (view.exercises[exIdx].sets.every((d, j) => j === setIdx || d)) setOpenIdx('auto')
  }
  const start = () => setLog((prev) => ({ ...prev, [today]: current(prev) }))
  const switchTo = (w: Workout) => {
    setChosenId(w.id)
    setOpenIdx('auto')
    if (session) setLog((prev) => ({ ...prev, [today]: startSession(w, today) }))
  }
  const pick = (w: Workout) => {
    if (w.id === view.workoutId) return setSwitching(undefined)
    if (session?.exercises.some((e) => e.sets.some(Boolean))) return setSwitching(w)
    switchTo(w)
    setSwitching(undefined)
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
    <div className="flex flex-col gap-2.5 pb-24">
      {unfinished && <UnfinishedCard session={unfinished} setLog={setLog} />}
      <div className="flex items-center justify-between"><div className="label-caps">{`${formatDayLabel(today)} · TREINO ${view.workoutLabel}`}</div>{pastLink}</div>
      <h1 className="text-[26px] font-bold tracking-tight text-strong">{view.workoutName}</h1>
      {!session?.completedAt && plan.workouts.length > 1 && (
        <Button variant="ghost" size="sm" className="-ml-2.5 self-start text-accent" onClick={() => setSwitching('list')}><ArrowLeftRight aria-hidden="true" /> Trocar treino</Button>
      )}

      <Card className="flex-row items-center gap-3.5 p-3.5">
        <div
          className="flex size-[72px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--color-accent) 0 ${stats.total ? (stats.done / stats.total) * 100 : 0}%, var(--color-line) 0)` }}
        >
          <div className="flex size-[58px] flex-col items-center justify-center rounded-full bg-panel">
            <span className="text-[15px] leading-none font-bold text-strong tabular-nums">{stats.done}/{stats.total}</span>
            <span className="text-[10px] text-faint">séries</span>
          </div>
        </div>
        <div>
          <div className="text-[13px] text-text-2">Volume de hoje</div>
          <div className="text-lg font-semibold text-strong tabular-nums">{`${formatKg(stats.volumeKg)} kg`}</div>
          <div className="text-[13px] text-text-2">{minutes === null ? plural(view.exercises.length, 'exercício', 'exercícios') : `${minutes} min · ${plural(view.exercises.length, 'exercício', 'exercícios')}`}</div>
        </div>
      </Card>
      {!log[today] && workout && (
        <Button variant="outline" className="w-full" onClick={markRest}><Moon aria-hidden="true" /> Descansar hoje</Button>
      )}

      {view.exercises.map((e, i) => !isCardio(e) && (
        <ExerciseCard key={i} ex={e} open={open === i} onToggle={() => setOpenIdx(open === i ? null : i)} onPreview={() => setPreview(i)}>
          <SetTable ex={e} prev={previousSets(log, today, e.exerciseId)} onCheck={(j, v) => check(i, j, v)} onEdit={(j, p) => edit(i, j, p)} />
        </ExerciseCard>
      ))}
      {view.exercises.some(isCardio) && <div className="label-caps">Cardio</div>}
      {view.exercises.map((e, i) => isCardio(e) && (
        <Card key={i} className="flex-row items-center gap-1.5 py-1.5 pr-2 pl-1.5">
          <Button variant="ghost" size="icon" aria-label={`Ver ${e.name}`} onClick={() => setPreview(i)}>
            <IconDot color="var(--c1)" size={32}><HeartPulse size={16} aria-hidden="true" /></IconDot>
          </Button>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold break-words text-strong">{e.name}</span>
            <span className="block text-[13px] text-text-2">{e.reps}</span>
          </span>
          <Toggle variant="check" size="check" pressed={!!e.sets[0]} aria-label={`${e.name} feito`} onPressedChange={() => toggleCardio(i)}>
            <Check size={18} aria-hidden="true" />
          </Toggle>
        </Card>
      ))}

      <div className="pointer-events-none fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      {session && (session.restEndsAt !== undefined || session.restPausedLeftMs !== undefined) && (
        <RestCard
          endAt={session.restEndsAt}
          pausedLeftMs={session.restPausedLeftMs}
          totalSec={restTotal}
          restSec={view.exercises[restIdx]?.restSec ?? PLAN_DEFAULTS.restSec}
          onDone={finishRest}
          onAdd15={() => {
            patch((s) => (s.restPausedLeftMs !== undefined ? { ...s, restPausedLeftMs: s.restPausedLeftMs + 15_000 } : { ...s, restEndsAt: (s.restEndsAt ?? Date.now()) + 15_000 }))
            setRestTotal((t) => t && t + 15)
          }}
          onTogglePause={() =>
            patch((s) =>
              s.restPausedLeftMs !== undefined
                ? { ...s, restEndsAt: Date.now() + s.restPausedLeftMs, restPausedLeftMs: undefined }
                : { ...s, restEndsAt: undefined, restPausedLeftMs: Math.max(0, (s.restEndsAt ?? Date.now()) - Date.now()) },
            )
          }
          onPickDuration={(sec) => {
            const idx = restIdx
            patch((s) => ({ ...s, restEndsAt: Date.now() + sec * 1000, restPausedLeftMs: undefined, exercises: s.exercises.map((e, i) => (i === idx ? { ...e, restSec: sec } : e)) }))
            setPlan((p) => ({ workouts: p.workouts.map((w) => (w.id === view.workoutId ? { ...w, exercises: w.exercises.map((e, i) => (i === idx ? { ...e, restSec: sec } : e)) } : w)) }))
            setRestTotal(sec)
          }}
        />
      )}
      <div className="fixed bottom-[calc(var(--nav-h)+12px+env(safe-area-inset-bottom))] left-1/2 z-(--z-bar) w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2">
        {session?.completedAt ? (
          <Button variant="secondary" className="w-full font-bold" disabled><Check aria-hidden="true" /> Treino concluído</Button>
        ) : (
          <Button className="w-full font-bold" disabled={!!session && stats.done === 0} onClick={session ? conclude : start}>{session ? <><Check aria-hidden="true" /> Concluir treino</> : 'Iniciar treino'}</Button>
        )}
      </div>
      {switching === 'list' && <SwitchWorkout workouts={plan.workouts} shownId={view.workoutId} nextId={next?.id} onPick={pick} onClose={() => setSwitching(undefined)} />}
      <ConfirmDialog open={typeof switching === 'object'} title="Trocar de treino?" text="As séries marcadas hoje serão descartadas." confirm="Trocar" destructive onCancel={() => setSwitching(undefined)} onConfirm={() => { if (typeof switching === 'object') switchTo(switching); setSwitching(undefined) }} />
      {preview !== undefined && <ExercisePreview exercise={view.exercises[preview]} onClose={closePreview} />}
    </div>
  )
}
