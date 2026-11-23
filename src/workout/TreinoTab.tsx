import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Check, ChevronRight, Dumbbell, HeartPulse, History, Moon, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SetDone, Workout, WorkoutLog, WorkoutSession } from './types'
import { usePersisted } from '@/storage/db'
import { cn, omitKey } from '@/lib/utils'
import { formatDayLabel } from '@/lib/date'
import { tick, useToday } from '@/lib/useToday'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/EmptyState'
import { TabHeader } from '@/components/TabHeader'
import { plural } from '@/lib/number'
import { PlanEditor } from './PlanEditor'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePreview } from './ExercisePreview'
import { SetTable } from './SetTable'
import { RestCard, RestPicker } from './RestCard'
import { nextWorkout, unfinishedSession } from './schedule'
import {
  activeRest, changePlanRest, changeRestDuration, clearRest, completeSession, completeUnfinishedSession, editSession, extendRest,
  firstIncompleteExercise, hasMarkedSets, holdsTrainingDay, isExerciseComplete, nthOccurrence, reopenSession, restExerciseIndex,
  setDone, startSession, toggleRestPause, toggleSetWithRest, toggleSkip,
} from './session'
import { previousSets, sessionStats } from './stats'
import { carryRest, dropSession, isRest, restRecord, sessionOf } from './rest'
import { unlockAudio } from './restTimer'
import { PLAN_DEFAULTS } from './exercises'
import { ExerciseGroups, ExerciseThumb } from './ExerciseGroups'
import { REST_STEP } from './limits'
import { useWorkoutPlan } from './useWorkoutPlan'
import { workoutDayLabel } from './display'
import { UnfinishedCard } from './UnfinishedCard'
import { SwitchWorkout, WorkoutRow } from './SwitchWorkout'
import { PastWorkouts } from './PastWorkouts'
import { DoneSummary } from './DoneSummary'
import { WorkoutPreview } from './WorkoutPreview'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { addExtraExercise, CARDIO_ID, removeExercise, startCardio, startExtra, startFreeCardio, switchCardio, unfinishedExtra } from './extra'
import { useTrainingLog } from './useTrainingLog'
import { AddExtraExercise } from './AddExtraExercise'
import { EffortSheet } from './EffortSheet'
import { upSoFar } from './score'
import { DurationSheet } from './DurationSheet'
import { CardioSwitchSheet } from './CardioSwitchSheet'
import { isCardio } from './reps'

export function TreinoTab() {
  const clock = useToday()
  const [today, setToday] = useState(clock.today)
  const [seenAt, setSeenAt] = useState(clock.now)
  const { plan, replacePlan, setPlan } = useWorkoutPlan()
  const [log, setLog] = usePersisted('workoutLog')
  const [extraLog, setExtraLog] = usePersisted('extraLog')
  const [chosenId, setChosenId] = useState<string>()
  const [editingPlan, setEditingPlan] = useState(false)
  const [switching, setSwitching] = useState<'list' | Workout>()
  const [pastOpen, setPastOpen] = useState(false)
  const [extraSummary, setExtraSummary] = useState(false)
  const [adding, setAdding] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [pickingCardio, setPickingCardio] = useState(false)
  const [cardioIdx, setCardioIdx] = useState<number>()
  const [concluding, setConcluding] = useState(false)
  const [preview, setPreview] = useState<number>()
  const [openIdx, setOpenIdx] = useState<'auto' | number | null>('auto')
  const [restTotal, setRestTotal] = useState<number>()
  const [pickIdx, setPickIdx] = useState<number>() // exercício cujo descanso o seletor edita; vive aqui pra sobreviver ao fim da contagem
  // relógio compartilhado: além do tempo do treino, faz a virada do dia rodar com o app aberto
  useEffect(() => {
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  if (seenAt !== clock.now) {
    setSeenAt(clock.now)
    if (clock.today !== today && !holdsTrainingDay(log[today], clock.now) && !holdsTrainingDay(extraLog[today], clock.now)) {
      setToday(clock.today)
      setChosenId(undefined)
      setOpenIdx('auto')
      setDiscarding(false)
      setPickingCardio(false)
      setCardioIdx(undefined)
    }
  }

  const extra = extraLog[today]
  const extraOpen = !!extra && !extra.completedAt
  const cardio = extra?.workoutId === CARDIO_ID
  const canEditExtraExercises = extraOpen && !cardio
  const extraDoneLabel = cardio ? 'Cardio concluído' : 'Treino extra concluído'
  // com o extra aberto, a tela da sessão lê e grava no extraLog; ações da ficha seguem no workoutLog
  const target = extraOpen ? extraLog : log
  const setTarget = extraOpen ? setExtraLog : setLog
  const rest = isRest(log[today])
  const session = sessionOf(target[today])
  const sessionOpen = session && !session.completedAt
  const next = nextWorkout(plan, log)
  const workout = plan.workouts.find((w) => w.id === chosenId) ?? next
  const unfinished = unfinishedSession(log, today)
  // shortcut: extra vazio de dia anterior fica guardado sem uso; limpar se o extraLog crescer
  const unfinishedEx = unfinishedExtra(extraLog, today)
  const { training } = useTrainingLog()

  const patchIn = useCallback(
    (set: typeof setLog) => (f: (s: WorkoutSession) => WorkoutSession) =>
      set((prev) => {
        const s = sessionOf(prev[today])
        return s ? { ...prev, [today]: f(s) } : prev
      }),
    [today],
  )
  const patch = useMemo(() => patchIn(setTarget), [patchIn, setTarget])
  const patchExtra = patchIn(setExtraLog)
  const finishRest = useCallback(
    () => patch((s) => activeRest(s) ? clearRest(s) : s),
    [patch],
  )
  const closePreview = useCallback(() => setPreview(undefined), [])

    const pastLink = <Button variant="link" size="sm" className="text-accent" onClick={() => setPastOpen(true)}><History aria-hidden="true" />Treinos anteriores</Button>
  // o extra não mexe no registro da ficha: num dia de descanso, o descanso continua lá
  const startExtraToday = (started: WorkoutSession) => {
    setExtraLog((prev) => (prev[today] ? prev : { ...prev, [today]: started }))
    setOpenIdx('auto')
  }
  const pickCardio = () => {
    const planned = workout?.exercises.filter(isCardio)
    if (planned?.length) startExtraToday(startCardio(today, planned))
    else setPickingCardio(true)
  }
  const cardioButton = !extra && (
    <Button variant="outline" className="w-full" onClick={pickCardio}><HeartPulse aria-hidden="true" /> Somente cardio</Button>
  )
  const cardioPicker = pickingCardio && (
    <DurationSheet minutes={20} title="Duração do cardio" saveLabel="Iniciar cardio" onClose={() => setPickingCardio(false)} onSave={(minutes) => {
      startExtraToday(startFreeCardio(today, minutes))
      setPickingCardio(false)
    }} />
  )
  const actions = <>{!extra && <Button variant="link" size="sm" className="text-accent" onClick={() => startExtraToday(startExtra(today))}><Plus aria-hidden="true" />Treino extra</Button>}{pastLink}</>
  if (pastOpen) return <Overlay><PastWorkouts onClose={() => setPastOpen(false)} /></Overlay>
  if (extraSummary && extra?.completedAt) {
    return (
      <Overlay>
        <div className="flex flex-col gap-3 pb-6">
          <BackHeader title={extra.workoutName} onBack={() => setExtraSummary(false)} />
          <DoneSummary session={extra} sessions={training} onChange={(p) => patchExtra((s) => ({ ...s, ...p }))} />
        </div>
      </Overlay>
    )
  }
  if (editingPlan) return <Overlay><PlanEditor initial={plan} onSave={(p) => { replacePlan(p); setEditingPlan(false) }} onCancel={() => setEditingPlan(false)} /></Overlay>
  const undoRest = () =>
    setLog((prev) => (isRest(prev[today]) ? omitKey(prev, today) : prev))

  const resolveUnfinished = (pending: WorkoutSession, action: 'complete' | 'discard', set = setLog) => {
    const { date } = pending
    set((prev) => {
      if (action === 'complete') return prev[date] ? { ...prev, [date]: completeUnfinishedSession(prev[date]) } : prev
      return prev[date] ? dropSession(prev, prev[date]) : prev
    })
    toast(action === 'complete' ? 'Treino concluído' : 'Treino descartado', {
      action: { label: 'Desfazer', onClick: () => set((prev) => ({ ...prev, [date]: pending })) },
    })
  }
  const unresolved = (
    <>
      {unfinished && (
        <UnfinishedCard
          session={unfinished}
          onConclude={() => resolveUnfinished(unfinished, 'complete')}
          onDiscard={() => resolveUnfinished(unfinished, 'discard')}
        />
      )}
      {unfinishedEx && (
        <UnfinishedCard
          session={unfinishedEx}
          onConclude={() => resolveUnfinished(unfinishedEx, 'complete', setExtraLog)}
          onDiscard={() => resolveUnfinished(unfinishedEx, 'discard', setExtraLog)}
        />
      )}
    </>
  )
  const editExtra = () => {
    patchExtra(editSession)
    setOpenIdx('auto')
  }
  const extraDone = !sessionOpen && extra?.completedAt && (
    <p className="text-meta text-text-2">{extraDoneLabel} · <Button variant="link" size="sm" className="h-auto p-0 text-meta" onClick={() => setExtraSummary(true)}>Ver resumo</Button> · <Button variant="link" size="sm" className="h-auto p-0 text-meta" aria-label={cardio ? 'Editar cardio' : 'Editar séries do treino extra'} onClick={editExtra}>Editar séries</Button></p>
  )

  if (!workout && !session) {
    return (
      <div className="flex flex-col gap-2.5">
        <TabHeader eyebrow={formatDayLabel(today)} title="Treino" links={actions} />
        {unresolved}
        {extraDone}
        <EmptyState icon={<Dumbbell size={30} aria-hidden="true" />} title="Nenhum treino montado">
          <p className="max-w-64 text-sm text-text-2">Monte seu treino pra começar a marcar as séries.</p>
          <Button className="w-full max-w-xs" onClick={() => setEditingPlan(true)}>Montar treino</Button>
          {cardioButton && <div className="w-full max-w-xs">{cardioButton}</div>}
        </EmptyState>
        {cardioPicker}
      </div>
    )
  }

  if (rest && !chosenId && !extraOpen) {
    return (
      <div className="flex flex-col gap-2.5">
        <TabHeader eyebrow={formatDayLabel(today)} title="Treino" links={actions} />
        {unresolved}
        {extraDone}
        <EmptyState icon={<Moon size={30} aria-hidden="true" />} title="Descanso marcado">
          <p className="max-w-64 text-sm text-text-2">Hoje é dia de recuperar. Quer treinar mesmo assim?</p>
          <Button variant="outline"  onClick={undoRest}><Undo2 aria-hidden="true" /> Desfazer</Button>
        </EmptyState>
        <div className="label-section">Escolher um treino</div>
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
  const stats = sessionStats(view, clock.now)
  const minutes = session ? stats.minutes : null
  const restIdx = restExerciseIndex(view)
  const timer = activeRest(session)
  const open = openIdx === 'auto' ? firstIncompleteExercise(view) : openIdx
  const current = (prev: WorkoutLog) => extraOpen ? prev[today] : sessionOf(prev[today]) ?? carryRest(prev[today], startSession(workout!, today))
  const markRest = () => {
    setLog((prev) => (prev[today] ? prev : { ...prev, [today]: restRecord(today) }))
    toast('Descanso marcado')
  }

  const check = (exIdx: number, setIdx: number, v: SetDone) => {
    unlockAudio()
    const saved = setTarget((prev) => ({ ...prev, [today]: toggleSetWithRest(current(prev), exIdx, setIdx, v, Date.now()) }))
    const exercise = saved[today].exercises[exIdx]
    if (!exercise.sets[setIdx]) return
    setRestTotal(exercise.restSec)
    if (isExerciseComplete(exercise)) setOpenIdx('auto')
  }
  const skip = (exIdx: number, setIdx: number) => {
    const saved = setTarget((prev) => ({ ...prev, [today]: toggleSkip(current(prev), exIdx, setIdx, Date.now()) }))
    if (isExerciseComplete(saved[today].exercises[exIdx])) setOpenIdx('auto')
  }
  const start = () => setLog((prev) => ({ ...prev, [today]: current(prev) }))
  const switchTo = (w: Workout) => {
    setChosenId(w.id)
    setOpenIdx('auto')
    if (session) setLog((prev) => ({ ...prev, [today]: carryRest(prev[today], startSession(w, today)) }))
  }
  const pick = (w: Workout) => {
    if (w.id === view.workoutId) return setSwitching(undefined)
    if (session && hasMarkedSets(session)) return setSwitching(w)
    switchTo(w)
    setSwitching(undefined)
  }
  const toggleCardio = (exIdx: number) =>
    setTarget((prev) => {
      const s = current(prev)
      const e = s.exercises[exIdx]
      return { ...prev, [today]: toggleSetWithRest(s, exIdx, 0, { reps: e.reps, weightKg: 0 }, Date.now()) }
    })
  const edit = (exIdx: number, setIdx: number, p: Partial<SetDone>) =>
    patch((s) => {
      const cur = s.exercises[exIdx].sets[setIdx]
      return cur ? setDone(s, exIdx, setIdx, { ...cur, ...p }) : s
    })
  // sem esforço grava effort undefined: desfazer e pular não herda o número escolhido antes
  const conclude = (effort?: number) => {
    patch((s) => ({ ...completeSession(s, new Date()), effort }))
    if (extraOpen) setOpenIdx('auto')
    toast(extraOpen ? extraDoneLabel : 'Treino concluído', {
      action: { label: 'Desfazer', onClick: () => { patch(reopenSession); setOpenIdx('auto') } },
    })
  }
  // só aparece no treino em curso; concluído, o DoneSummary já calcula as linhas da nota
  const up = session?.completedAt ? 0 : upSoFar(training, view)
  const removeAt = (i: number) => {
    patch((s) => removeExercise(s, i))
    setOpenIdx('auto')
  }
  const discardSession = () => {
    setTarget((prev) => {
      const active = sessionOf(prev[today])
      if (!active || active.completedAt) return prev
      return dropSession(prev, active)
    })
    if (!extraOpen) setChosenId(undefined)
    setOpenIdx('auto')
    setRestTotal(undefined)
    setDiscarding(false)
  }
  const cancelButton = sessionOpen && (extraOpen || !session.editedFrom) && (
    <Button variant="link" size="sm" className="text-negative hover:text-negative" onClick={() => {
      if (hasMarkedSets(session) || session.editedFrom) setDiscarding(true)
      else discardSession()
    }}>Cancelar treino</Button>
  )

  return (
    <div className={cn('flex flex-col gap-2.5', timer ? 'pb-44' : session?.completedAt ? 'pb-28' : 'pb-24')}>
      <TabHeader eyebrow={extraOpen ? `${view.workoutName} · ${formatDayLabel(today)}` : workoutDayLabel(today, view.workoutLabel)} title={view.workoutName} links={sessionOpen ? cancelButton : actions} />
      {unresolved}
      {extraDone}
      {!extraOpen && !session?.completedAt && plan.workouts.length > 1 && (
        <Button variant="link" className="min-h-11 self-start" onClick={() => setSwitching('list')}><ArrowLeftRight aria-hidden="true" /> Trocar treino</Button>
      )}

      {!session && !extraOpen && workout ? (
        <>
          <WorkoutPreview workout={workout} sessions={training} today={today} />
          {!log[today] && !extra && <Button variant="outline" className="w-full" onClick={markRest}><Moon aria-hidden="true" /> Descansar hoje</Button>}
        </>
      ) : session?.completedAt ? <DoneSummary session={session} sessions={training} next={next} onChange={(p) => patch((s) => ({ ...s, ...p }))} /> : (
        <>
        <Card className="flex-row items-center gap-3.5">
          <div
            className="flex size-18 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--color-success) 0 ${stats.total ? (stats.done / stats.total) * 100 : 0}%, var(--color-surface) 0)` }}
          >
            <div className="flex size-14.5 flex-col items-center justify-center rounded-full bg-panel">
              <span className="text-body leading-none font-bold text-strong tabular-nums">{stats.done}/{stats.total}</span>
              <span className="text-caption text-faint">séries</span>
            </div>
          </div>
          <div>
            {up > 0 && <div className="text-lg font-semibold text-strong tabular-nums">{`↑ ${up} subindo até agora`}</div>}
            <div className="text-meta text-text-2">{minutes === null ? plural(view.exercises.length, 'exercício', 'exercícios') : `${minutes} min · ${plural(view.exercises.length, 'exercício', 'exercícios')}`}</div>
          </div>
        </Card>

        <ExerciseGroups
          exercises={view.exercises}
          className={() => 'contents'}
          row={(e, i, cardio) => {
            const occurrence = nthOccurrence(view.exercises, i)
            const key = `${view.workoutId}-${today}-${e.exerciseId}-${occurrence}`
            if (cardio) {
              return (
                <Card size="sm" key={key} className="gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" aria-label={`Ver ${e.name}`} onClick={() => setPreview(i)}>
                      <ExerciseThumb muscles={e.muscles} image={e.images[0]} cardio />
                    </Button>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold break-words text-strong">{e.name}</span>
                      <span className="block text-meta text-text-2">{e.reps}</span>
                    </span>
                    <Checkbox size="check" className="mr-1.5" checked={!!e.sets[0]} aria-label={`${e.name} feito`} onCheckedChange={() => toggleCardio(i)} />
                    {canEditExtraExercises && <Button variant="ghost" size="icon" className="text-negative hover:text-negative" aria-label={`Remover ${e.name}`} onClick={() => removeAt(i)}><Trash2 aria-hidden="true" /></Button>}
                  </div>
                  <Button variant="ghost" size="sm" className="self-end text-accent" aria-label={`Trocar cardio (${e.name})`} onClick={() => setCardioIdx(i)}>
                    <ArrowLeftRight aria-hidden="true" /> Trocar cardio
                  </Button>
                </Card>
              )
            }
            const prev = previousSets(training, today, e.exerciseId, occurrence)
            return (
              <ExerciseCard key={key} ex={e} prev={prev} open={open === i} onToggle={() => setOpenIdx(open === i ? null : i)} onPreview={() => setPreview(i)}>
                <SetTable ex={e} prev={prev} onCheck={(j, v) => check(i, j, v)} onEdit={(j, p) => edit(i, j, p)} onSkip={(j) => skip(i, j)} />
                {canEditExtraExercises && <Button variant="link" className="text-negative hover:text-negative" onClick={() => removeAt(i)}>Remover exercício</Button>}
              </ExerciseCard>
            )
          }}
        />
        {canEditExtraExercises && (
          <Button variant="outline" className="w-full" onClick={() => setAdding(true)}><Plus aria-hidden="true" /> Adicionar exercício</Button>
        )}
        </>
      )}

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
          <Button variant="secondary" className="w-full font-bold" onClick={() => patch(editSession)}><Pencil aria-hidden="true" /> Editar séries</Button>
        ) : (
          <div className={cn('grid gap-2', !session && cardioButton && 'grid-cols-2')}>
            {!session && cardioButton}
            <Button className="w-full font-bold" disabled={!!session && stats.done === 0} onClick={!session ? start : session.editedFrom ? () => conclude(session.effort) : () => setConcluding(true)}>{session ? <><Check aria-hidden="true" /> Concluir treino</> : 'Iniciar treino'}</Button>
          </div>
        )}
      </div>
      {switching === 'list' && <SwitchWorkout workouts={plan.workouts} shownId={view.workoutId} nextId={next?.id} onPick={pick} onClose={() => setSwitching(undefined)} />}
      <ConfirmDialog open={typeof switching === 'object'} title="Trocar de treino?" text="As séries marcadas hoje serão descartadas." confirm="Trocar" destructive onCancel={() => setSwitching(undefined)} onConfirm={() => { if (typeof switching === 'object') switchTo(switching); setSwitching(undefined) }} />
      {/* montado só aberto: no jsdom o Drawer fechado segue escondendo a tela da árvore de a11y */}
      {concluding && <EffortSheet value={session?.effort} onPick={conclude} onSkip={() => conclude()} onClose={() => setConcluding(false)} />}
      <ConfirmDialog open={discarding} title="Cancelar treino?" text={session?.editedFrom ? 'O treino será removido do histórico.' : 'As séries marcadas serão perdidas.'} confirm="Descartar treino" destructive onCancel={() => setDiscarding(false)} onConfirm={discardSession} />
      {cardioPicker}
      {cardioIdx !== undefined && (
        <CardioSwitchSheet
          onPick={(activity) => { patch((s) => switchCardio(s, cardioIdx, activity)); setCardioIdx(undefined) }}
          onClose={() => setCardioIdx(undefined)}
        />
      )}
      {adding && (
        <AddExtraExercise
          onAdd={(e, sets) => { patch((s) => addExtraExercise(s, e, sets)); setOpenIdx(view.exercises.length); setAdding(false) }}
          onClose={() => setAdding(false)}
        />
      )}
      {preview !== undefined && <ExercisePreview exercise={view.exercises[preview]} onClose={closePreview} />}
    </div>
  )
}
