import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronRight, Dumbbell, Moon } from 'lucide-react'
import { toast } from 'sonner'
import type { SetDone, WorkoutLog, WorkoutPlan } from '../types'
import { load, usePersisted } from '../storage/db'
import { formatDayLabel, todayKey } from '../lib/date'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { formatKg } from '@/lib/number'
import { PlanEditor } from './PlanEditor'
import { Overlay } from '../shell/SettingsScreen'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePreview } from './ExercisePreview'
import { SetTable } from './SetTable'
import { RestCard } from './RestCard'
import { workoutForDate } from './schedule'
import { completeSession, setDone, setRestEnd, startSession } from './session'
import { firstIncomplete, previousSets, sessionStats } from './stats'
import { unlockAudio } from './restTimer'

const EMPTY_PLAN: WorkoutPlan = { workouts: [] }
const EMPTY_LOG: WorkoutLog = {}
const LABEL = 'text-[10px] font-semibold uppercase tracking-[.05em] text-faint'
const exCount = (n: number) => `${n} exercício${n === 1 ? '' : 's'}`

export function TreinoTab() {
  const [today, setToday] = useState(() => todayKey()) // treino que passa da meia-noite segue no mesmo dia
  const [plan, , planLoaded] = usePersisted('workoutPlan', EMPTY_PLAN)
  const [log, setLog, logLoaded] = usePersisted('workoutLog', EMPTY_LOG)
  const [chosenId, setChosenId] = useState<string>()
  const [editingPlan, setEditingPlan] = useState(false)
  const [preview, setPreview] = useState<number>()
  const [openIdx, setOpenIdx] = useState<number>() // undefined = primeiro incompleto
  const [restTotal, setRestTotal] = useState<number>()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000) // minutos do resumo andam sozinhos
    return () => clearInterval(id)
  }, [])

  const session = log[today]

  // o PWA volta do segundo plano sem remontar: troca de dia, menos com treino em andamento
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || todayKey() === today) return
      // lê o salvo, não o render: um check recém-feito pode ainda não ter chegado na tela
      const s = (await load('workoutLog').catch(() => undefined))?.[today]
      if (s && !s.completedAt) return
      setToday(todayKey())
      setChosenId(undefined)
      setOpenIdx(undefined)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [today])
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
  const closePreview = useCallback(() => setPreview(undefined), [])

  if (!planLoaded || !logLoaded) return <p className="text-sm text-text-2">Carregando…</p>

  if (editingPlan) return <Overlay><PlanEditor onDone={() => setEditingPlan(false)} onCancel={() => setEditingPlan(false)} /></Overlay>
  if (plan.workouts.length === 0) {
    return (
      <EmptyState icon={<Dumbbell size={30} aria-hidden="true" />} title="Nenhum treino montado">
        <p className="max-w-[260px] text-sm text-text-2">Monte seu treino pra começar a marcar as séries.</p>
        <Button className="mt-2 w-full max-w-xs" onClick={() => setEditingPlan(true)}>Montar treino</Button>
      </EmptyState>
    )
  }

  if (!session && !workout) {
    return (
      <div>
        <div className={LABEL}>{formatDayLabel(today)}</div>
        <EmptyState icon={<Moon size={30} aria-hidden="true" />} title="Dia de descanso">
          <p className="max-w-[260px] text-sm text-text-2">Seu plano não tem treino hoje. Quer treinar mesmo assim?</p>
        </EmptyState>
        <div className={`${LABEL} mx-0.5 mb-1.5`}>Escolher um treino</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
          {plan.workouts.map((w) => (
            <button key={w.id} type="button" onClick={() => setChosenId(w.id)} className="flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent-line bg-accent-bg text-sm font-bold text-accent">{w.label}</span>
              <span className="block min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-strong">{w.name}</span>
                <span className="block text-[13px] text-text-2">{exCount(w.exercises.length)}</span>
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
  const open = openIdx ?? firstIncomplete(view)

  const check = (exIdx: number, setIdx: number, v: SetDone) => {
    unlockAudio() // dentro do toque: o iOS só libera áudio num gesto
    const restSec = view.exercises[exIdx].restSec
    let marked = false // o updater do usePersisted roda na hora, então dá pra ler depois
    setLog((prev) => {
      const s = prev[today] ?? startSession(workout!, today)
      marked = !s.exercises[exIdx].sets[setIdx] // decide no último valor salvo: dois toques rápidos desmarcam
      const next = setDone(s, exIdx, setIdx, marked ? v : null)
      return { ...prev, [today]: marked ? setRestEnd(next, Date.now() + restSec * 1000) : next }
    })
    if (!marked) return
    setRestTotal(restSec)
    if (view.exercises[exIdx].sets.every((d, j) => j === setIdx || d)) setOpenIdx(undefined) // completou: vai pro próximo incompleto
  }
  const edit = (exIdx: number, setIdx: number, p: Partial<SetDone>) =>
    patch((s) => {
      const cur = s.exercises[exIdx].sets[setIdx]
      return cur ? setDone(s, exIdx, setIdx, { ...cur, ...p }) : s // desmarcada no meio: não remarca
    })
  const conclude = () => {
    patch((s) => completeSession(s, new Date()))
    toast('Treino concluído', {
      action: { label: 'Desfazer', onClick: () => patch((s) => ({ ...s, completedAt: undefined })) },
    })
  }

  return (
    <div className="pb-24">
      <div className={LABEL}>{`${formatDayLabel(today)} · TREINO ${view.workoutLabel}`}</div>
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
          <div className="mt-1 text-[13px] text-text-2">{minutes === null ? exCount(view.exercises.length) : `${minutes} min · ${exCount(view.exercises.length)}`}</div>
        </div>
      </div>

      {view.exercises.map((e, i) => (
        <ExerciseCard key={i} ex={e} open={open === i} onToggle={() => setOpenIdx(open === i ? -1 : i)} onPreview={() => setPreview(i)}>
          <SetTable ex={e} prev={previousSets(log, today, e.exerciseId)} onCheck={(j, v) => check(i, j, v)} onEdit={(j, p) => edit(i, j, p)} />
        </ExerciseCard>
      ))}

      <div className="pointer-events-none fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      {session?.restEndsAt !== undefined && (
        <RestCard
          endAt={session.restEndsAt}
          totalSec={restTotal}
          onSkip={finishRest}
          onAdd15={() => {
            patch((s) => setRestEnd(s, (s.restEndsAt ?? Date.now()) + 15_000))
            setRestTotal((t) => t && t + 15)
          }}
          onFinish={finishRest}
        />
      )}
      <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-10 w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2">
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
