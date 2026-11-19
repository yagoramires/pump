import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, Check, ChevronRight, Dumbbell, History, Moon, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SetDone, WorkoutLog, WorkoutSession } from './types'
import { usePersisted } from '@/storage/db'
import { cn, omitKey } from '@/lib/utils'
import { formatDayLabel } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/EmptyState'
import { TabHeader } from '@/components/TabHeader'
import { formatKg, plural } from '@/lib/number'
import { PlanEditor } from './PlanEditor'
import { Overlay } from '@/components/Overlay'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePreview } from './ExercisePreview'
import { SetTable } from './SetTable'
import { RestCard, RestPicker } from './RestCard'
import { nextWorkout, unfinishedSession } from './schedule'
import {
  activeRest, changePlanRest, changeRestDuration, clearRest, completeSession, completeUnfinishedSession, extendRest,
  firstIncompleteExercise, hasMarkedSets, holdsTrainingDay, isExerciseComplete, reopenSession, restExerciseIndex,
  setDone, startSession, toggleRestPause, toggleSetWithRest,
} from './session'
import { previousSets, sessionStats } from './stats'
import { isRest, restRecord, sessionOf } from './rest'
import { unlockAudio } from './restTimer'
import { PLAN_DEFAULTS } from './exercises'
import { ExerciseGroups } from './ExerciseGroups'
import { ExerciseIcon } from './ExerciseIcon'
import { REST_STEP } from './limits'
import { useWorkoutPlan } from './useWorkoutPlan'
import { workoutDayLabel } from './display'
import { UnfinishedCard } from './UnfinishedCard'
import { SwitchWorkout, WorkoutRow } from './SwitchWorkout'
import { PastWorkouts } from './PastWorkouts'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Workout } from './types'

export function TreinoTab() {
  const clock = useToday()
  const [today, setToday] = useState(clock.today)
  const [seenAt, setSeenAt] = useState(clock.now)
  const { plan, replacePlan, setPlan } = useWorkoutPlan()
  const [log, setLog] = usePersisted('workoutLog')
  const [chosenId, setChosenId] = useState<string>()
  const [editingPlan, setEditingPlan] = useState(false)
  const [switching, setSwitching] = useState<'list' | Workout>()
  const [pastOpen, setPastOpen] = useState(false)
  const [preview, setPreview] = useState<number>()
  const [openIdx, setOpenIdx] = useState<'auto' | number | null>('auto')
  const [restTotal, setRestTotal] = useState<number>()
  const [pickIdx, setPickIdx] = useState<number>() // exercício cujo descanso o seletor edita; vive aqui pra sobreviver ao fim da contagem
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (seenAt !== clock.now) {
    setSeenAt(clock.now)
    if (clock.today !== today && !holdsTrainingDay(log[today], clock.now)) {
      setToday(clock.today)
      setChosenId(undefined)
      setOpenIdx('auto')
    }
  }

  const rest = isRest(log[today])
  const session = sessionOf(log[today])
  const next = nextWorkout(plan, log)
  const workout = plan.workouts.find((w) => w.id === chosenId) ?? next
  const unfinished = unfinishedSession(log, today)

  const patch = useCallback(
    (f: (s: WorkoutSession) => WorkoutSession) =>
      setLog((prev) => {
        const s = sessionOf(prev[today])
        return s ? { ...prev, [today]: f(s) } : prev
      }),
    [setLog, today],
  )
  const finishRest = useCallback(
    () => patch((s) => activeRest(s) ? clearRest(s) : s),
    [patch],
  )
  const closePreview = useCallback(() => setPreview(undefined), [])

  // abaixo de 360 px o rótulo vira só leitor de tela: o eyebrow não pode ser espremido
  const pastLink = <Button variant="link" size="sm" className="text-accent" onClick={() => setPastOpen(true)}><History aria-hidden="true" /><span className="max-[359px]:sr-only">Treinos anteriores</span></Button>
  if (pastOpen) return <Overlay><PastWorkouts onClose={() => setPastOpen(false)} /></Overlay>
  if (editingPlan) return <Overlay><PlanEditor initial={plan} onSave={(p) => { replacePlan(p); setEditingPlan(false) }} onCancel={() => setEditingPlan(false)} /></Overlay>
  if (plan.workouts.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        <TabHeader eyebrow={formatDayLabel(today)} title="Treino" />
        <EmptyState icon={<Dumbbell size={30} aria-hidden="true" />} title="Nenhum treino montado">
          <p className="max-w-64 text-sm text-text-2">Monte seu treino pra começar a marcar as séries.</p>
          <Button className="w-full max-w-xs" onClick={() => setEditingPlan(true)}>Montar treino</Button>
        </EmptyState>
      </div>
    )
  }

  const undoRest = () =>
    setLog((prev) => (isRest(prev[today]) ? omitKey(prev, today) : prev))

  const resolveUnfinished = (pending: WorkoutSession, action: 'complete' | 'discard') => {
    const { date } = pending
    setLog((prev) => {
      if (action === 'complete') return prev[date] ? { ...prev, [date]: completeUnfinishedSession(prev[date]) } : prev
      return omitKey(prev, date)
    })
    toast(action === 'complete' ? 'Treino concluído' : 'Treino descartado', {
      action: { label: 'Desfazer', onClick: () => setLog((prev) => ({ ...prev, [date]: pending })) },
    })
  }
  const unresolved = unfinished && (
    <UnfinishedCard
      session={unfinished}
      onConclude={() => resolveUnfinished(unfinished, 'complete')}
      onDiscard={() => resolveUnfinished(unfinished, 'discard')}
    />
  )

  if (rest && !chosenId) {
    return (
      <div className="flex flex-col gap-2.5">
        <TabHeader eyebrow={formatDayLabel(today)} actions={pastLink} />
        {unresolved}
        <EmptyState icon={<Moon size={30} aria-hidden="true" />} title="Descanso marcado">
          <p className="max-w-64 text-sm text-text-2">Hoje é dia de recuperar. Quer treinar mesmo assim?</p>
          <Button variant="outline"  onClick={undoRest}><Undo2 aria-hidden="true" /> Desfazer</Button>
        </EmptyState>
        <div className="label-caps">Escolher um treino</div>
        <Card size="flush">
          {plan.workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} sub={plural(w.exercises.length, 'exercício', 'exercícios')} onClick={() => setChosenId(w.id)} className="border-t border-line px-3.5 py-2.5 first:border-t-0">
              <ChevronRight size={16} className="text-faint" aria-hidden="true" />
            </WorkoutRow>
          ))}
        </Card>
      </div>
    )
  }

  const view = session ?? startSession(workout!, today)
  const stats = sessionStats(view, now)
  const minutes = session ? stats.minutes : null
  const restIdx = restExerciseIndex(view)
  const timer = activeRest(session)
  const open = openIdx === 'auto' ? firstIncompleteExercise(view) : openIdx
  const current = (prev: WorkoutLog) => sessionOf(prev[today]) ?? startSession(workout!, today)
  const markRest = () => {
    setLog((prev) => (prev[today] ? prev : { ...prev, [today]: restRecord(today) }))
    toast('Descanso marcado')
  }

  const check = (exIdx: number, setIdx: number, v: SetDone) => {
    unlockAudio()
    const saved = setLog((prev) => ({ ...prev, [today]: toggleSetWithRest(current(prev), exIdx, setIdx, v, Date.now()) }))
    const exercise = saved[today].exercises[exIdx]
    if (!exercise.sets[setIdx]) return
    setRestTotal(exercise.restSec)
    if (isExerciseComplete(exercise)) setOpenIdx('auto')
  }
  const start = () => setLog((prev) => ({ ...prev, [today]: current(prev) }))
  const switchTo = (w: Workout) => {
    setChosenId(w.id)
    setOpenIdx('auto')
    if (session) setLog((prev) => ({ ...prev, [today]: startSession(w, today) }))
  }
  const pick = (w: Workout) => {
    if (w.id === view.workoutId) return setSwitching(undefined)
    if (session && hasMarkedSets(session)) return setSwitching(w)
    switchTo(w)
    setSwitching(undefined)
  }
  const toggleCardio = (exIdx: number) =>
    setLog((prev) => {
      const s = current(prev)
      const e = s.exercises[exIdx]
      return { ...prev, [today]: toggleSetWithRest(s, exIdx, 0, { reps: e.reps, weightKg: 0 }, Date.now()) }
    })
  const edit = (exIdx: number, setIdx: number, p: Partial<SetDone>) =>
    patch((s) => {
      const cur = s.exercises[exIdx].sets[setIdx]
      return cur ? setDone(s, exIdx, setIdx, { ...cur, ...p }) : s
    })
  const conclude = () => {
    patch((s) => completeSession(s, new Date()))
    toast('Treino concluído', {
      action: { label: 'Desfazer', onClick: () => patch(reopenSession) },
    })
  }

  return (
    <div className={cn('flex flex-col gap-2.5', timer ? 'pb-44' : 'pb-24')}>
      <TabHeader eyebrow={workoutDayLabel(today, view.workoutLabel)} title={view.workoutName} actions={pastLink} />
      {unresolved}
      {!session?.completedAt && plan.workouts.length > 1 && (
        <Button variant="link" className="min-h-11 self-start" onClick={() => setSwitching('list')}><ArrowLeftRight aria-hidden="true" /> Trocar treino</Button>
      )}

      <Card className="flex-row items-center gap-3.5">
        <div
          className="flex size-18 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--color-accent) 0 ${stats.total ? (stats.done / stats.total) * 100 : 0}%, var(--color-line) 0)` }}
        >
          <div className="flex size-14.5 flex-col items-center justify-center rounded-full bg-panel">
            <span className="text-body leading-none font-bold text-strong tabular-nums">{stats.done}/{stats.total}</span>
            <span className="text-micro text-faint">séries</span>
          </div>
        </div>
        <div>
          <div className="text-meta text-text-2">Volume de hoje</div>
          <div className="text-lg font-semibold text-strong tabular-nums">{`${formatKg(stats.volumeKg)} kg`}</div>
          <div className="text-meta text-text-2">{minutes === null ? plural(view.exercises.length, 'exercício', 'exercícios') : `${minutes} min · ${plural(view.exercises.length, 'exercício', 'exercícios')}`}</div>
        </div>
      </Card>
      {!log[today] && workout && (
        <Button variant="outline" className="w-full" onClick={markRest}><Moon aria-hidden="true" /> Descansar hoje</Button>
      )}

      <ExerciseGroups
        exercises={view.exercises}
        className={() => 'contents'}
        row={(e, i, cardio) => {
          if (cardio) {
            return (
              <Card size="sm" key={i} className="flex-row items-center gap-1.5">
                <Button variant="ghost" size="icon" aria-label={`Ver ${e.name}`} onClick={() => setPreview(i)}>
                  <ExerciseIcon muscles={e.muscles} cardio size={32} />
                </Button>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold break-words text-strong">{e.name}</span>
                  <span className="block text-meta text-text-2">{e.reps}</span>
                </span>
                <Checkbox size="check" className="mr-1.5" checked={!!e.sets[0]} aria-label={`${e.name} feito`} onCheckedChange={() => toggleCardio(i)} />
              </Card>
            )
          }
          const prev = previousSets(log, today, e.exerciseId)
          return (
            <ExerciseCard key={i} ex={e} prev={prev} open={open === i} onToggle={() => setOpenIdx(open === i ? null : i)} onPreview={() => setPreview(i)}>
              <SetTable ex={e} prev={prev} onCheck={(j, v) => check(i, j, v)} onEdit={(j, p) => edit(i, j, p)} />
            </ExerciseCard>
          )
        }}
      />

      <div className="pointer-events-none fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      {timer && (
        <RestCard
          timer={timer}
          totalSec={restTotal}
          restSec={view.exercises[restIdx]?.restSec ?? PLAN_DEFAULTS.restSec}
          onDone={finishRest}
          onExtend={() => {
            patch((s) => extendRest(s, REST_STEP * 1000))
            setRestTotal((t) => t && t + REST_STEP)
          }}
          onTogglePause={() => patch((s) => toggleRestPause(s, Date.now()))}
          onPickDuration={() => setPickIdx(restIdx)}
        />
      )}
      <RestPicker
        open={pickIdx !== undefined}
        restSec={view.exercises[pickIdx ?? restIdx]?.restSec ?? PLAN_DEFAULTS.restSec}
        onClose={() => setPickIdx(undefined)}
        onPick={(sec) => {
          const idx = pickIdx ?? restIdx
          patch((s) => changeRestDuration(s, idx, sec, Date.now()))
          setPlan((p) => changePlanRest(p, view, idx, sec))
          setRestTotal(sec)
        }}
      />
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
