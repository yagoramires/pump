import { lazy, Suspense, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Share2, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Chips } from '@/components/Chips'
import { useOpenSettings } from '@/components/openSettings'
import { fetchExercises } from '@/catalog/catalog'
import { useCatalog } from '@/catalog/useCatalog'
import type { Exercise } from '@/catalog/types'
import { addDays, formatDayMonth, mondayWeekStart } from '@/lib/date'
import { formatDec, formatKg, plural } from '@/lib/number'
import { useToday } from '@/lib/useToday'
import { usePersisted } from '@/storage/db'
import type { SessionExercise, SetDone, Workout, WorkoutLog, WorkoutSession } from './types'
import { sessionStats } from './stats'
import { markedSets } from './session'
import { isCardio } from './reps'
import { DurationSheet } from './DurationSheet'
import { ScoreSheet } from './ScoreSheet'
import { ShareSheet } from './ShareSheet'
import { sessionScore, type ExerciseScore } from './score'
import { weeklyGoal } from './week'
import type { CardInput } from './shareCard'
import {
  exerciseCount, exerciseMarks, FEELING_LABEL, FEELINGS, feelingOf, formatDuration, highlightText, muscleLevels, plannedSets,
  primaryMuscles, sessionHighlight, volumeCoverage, weekDays, type Highlight,
} from './summary'

function Stat({ value, label, onClick }: { value: string; label: string; onClick?: () => void }) {
  const card = (
    <Card className="flex-1 items-center gap-0.5 px-2.5 py-3 text-center">
      <div className="text-title font-bold text-strong tabular-nums">{value}</div>
      <div className="label-caps">{label}</div>
    </Card>
  )
  return onClick ? <Button variant="ghost" onClick={onClick} className="h-auto flex-1 p-0 whitespace-normal hover:bg-transparent">{card}</Button> : card
}

const setText = (s: SetDone) => (s.weightKg ? `${formatKg(s.weightKg)} × ${s.reps}` : s.reps)
const ARROW = { up: '↑', same: '=', down: '↓' } as Partial<Record<ExerciseScore['trend'], string>>
function rowText(r: ExerciseScore) {
  if (r.done < r.planned || !r.best) return `${r.done} de ${r.planned} séries`
  const before = r.prevBest && (r.trend === 'up' || r.trend === 'down') ? ` (antes ${setText(r.prevBest)})` : ''
  return [ARROW[r.trend], `${setText(r.best)}${before}`].filter(Boolean).join(' ')
}

const HIGHLIGHT_ICON = { first: Sparkles, record: Trophy, goal: Target, improved: TrendingUp, neutral: Check }

function HighlightCard({ h }: { h: Highlight }) {
  const { title, detail } = highlightText(h)
  const Icon = HIGHLIGHT_ICON[h.kind]
  const lit = h.kind !== 'neutral'
  return (
    <Card className={`flex-row items-center gap-3 py-3.5 ${lit ? 'border-accent-line bg-accent-bg' : ''}`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${lit ? 'bg-accent text-on-accent' : 'bg-surface text-text-2'}`}><Icon size={20} aria-hidden="true" /></div>
      <div className="min-w-0">
        <div className="text-body font-semibold text-strong">{title}</div>
        {detail && <div className="text-meta text-text-2 tabular-nums">{detail}</div>}
      </div>
    </Card>
  )
}

function ExerciseRow({ e, r, record }: { e: SessionExercise; r: ExerciseScore; record: boolean }) {
  const sets = markedSets(e)
  return (
    <Collapsible className="border-t border-line first:border-t-0">
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 py-2 text-left text-sm">
        <span className="min-w-0 flex-1 text-strong">{e.name}</span>
        {record && <Trophy size={15} className="shrink-0 text-accent" aria-label="Recorde" />}
        {r.trend === 'new' && r.done > 0 && <Badge variant="outline" className="shrink-0">primeira vez</Badge>}
        <span className="shrink-0 text-text-2 tabular-nums">{rowText(r)}</span>
        <ChevronDown size={16} className="shrink-0 text-faint transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-2.5">
        {sets.length === 0 ? <div className="text-meta text-faint">nenhuma série feita</div>
          : isCardio(e) ? <div className="text-meta text-text-2">feito</div>
            : sets.map((d, j) => <div key={j} className="text-meta text-text-2 tabular-nums">{`${formatKg(d.weightKg)} kg × ${d.reps}`}</div>)}
      </CollapsibleContent>
    </Collapsible>
  )
}

// o desenho do corpo pesa ~60 KB: só carrega quando o resumo aparece
const BodyMap = lazy(() => import('./BodyMap').then((m) => ({ default: m.BodyMap })))

const noCatalog = () => Promise.resolve<Exercise[]>([])

/** sem `onEffort`/`onEditTimes` (Treinos anteriores) a tela é só leitura */
export function DoneSummary({ session, log, next, onEditTimes, onEffort }: { session: WorkoutSession; log: WorkoutLog; next?: Workout; onEditTimes?: (startedAt: string, endedAt: string) => void; onEffort?: (n?: number) => void }) {
  const [sheet, setSheet] = useState<'duration' | 'score' | CardInput>()
  const [profile] = usePersisted('profile')
  const [plan] = usePersisted('workoutPlan')
  const { today } = useToday()
  const openSettings = useOpenSettings()
  // plano antigo sem `primary`: busca os principais no catálogo
  const needsCatalog = session.exercises.some((e) => !e.custom && !e.primary)
  const { list: catalog } = useCatalog(needsCatalog ? fetchExercises : noCatalog)
  const levels = useMemo(() => muscleLevels(session.exercises, new Map(catalog.map((x) => [x.id, x.primary ?? []]))), [session.exercises, catalog])

  const stats = sessionStats(session)
  const score = sessionScore(log, session)
  const goal = weeklyGoal(profile.daysPerWeek, plan.workouts.length)
  const highlight = sessionHighlight(log, session, goal)
  const days = weekDays(log, session)
  const marks = exerciseMarks(log, session)
  const volume = volumeCoverage(session)
  const count = exerciseCount(session)
  const duration = stats.minutes === null ? '—' : formatDuration(stats.minutes)
  const week = mondayWeekStart(session.date)
  const feeling = feelingOf(session.effort)
  const muscles = primaryMuscles(levels)
  const recordShown = new Set<string>()

  const share = (): CardInput => ({
    label: session.workoutLabel, name: session.workoutName, date: session.date,
    minutes: stats.minutes, sets: stats.done, exercises: count, highlight, week: { days, goal }, levels,
  })

  return (
    <>
      <Card
        className="items-center gap-2 border-accent-line px-4 py-4 text-center"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, var(--color-accent-bg) 0%, var(--color-panel) 70%)' }}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_0_0_6px_rgb(198_255_61/0.12)]">
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </div>
        <div className="text-title font-bold text-strong">Treino concluído</div>
        {muscles.length > 0 && <div className="text-meta text-text-2">{muscles.join(' · ')}</div>}
      </Card>
      <div className="flex gap-2">
        <Stat value={duration} label="Duração" onClick={onEditTimes && stats.minutes !== null ? () => setSheet('duration') : undefined} />
        <Stat value={String(count)} label={count === 1 ? 'Exercício' : 'Exercícios'} />
        <Stat value={String(stats.done)} label={stats.done === 1 ? 'Série' : 'Séries'} />
      </div>
      <Button variant="ghost" aria-haspopup="dialog" onClick={() => setSheet('score')} className="h-11 justify-between px-1 text-body font-normal text-text-2">
        <span>Nota</span>
        <span className="flex items-center gap-1"><span className="font-semibold text-strong tabular-nums">{formatDec(score.score, 1)}</span>/10<ChevronRight size={16} aria-hidden="true" /></span>
      </Button>
      <HighlightCard h={highlight} />

      <Card className="gap-2 py-3.5">
        <div className="flex items-center gap-2">
          <span className="label-caps flex-1">{mondayWeekStart(today) === week ? 'Semana' : `Semana · ${formatDayMonth(week)} a ${formatDayMonth(addDays(week, 6))}`}</span>
          {onEffort && openSettings && <Button variant="link" size="sm" className="h-auto p-0 text-accent" onClick={openSettings}>Ajustar meta</Button>}
        </div>
        <div className="text-body font-semibold text-strong tabular-nums">{days >= goal ? `Meta da semana batida · ${days} de ${goal}` : `${days} de ${goal} treinos na semana`}</div>
        <Progress value={Math.min(100, (days / goal) * 100)} aria-label="Treinos na semana" className="h-1.5 bg-line" />
      </Card>

      {levels.size > 0 && <Card className="min-h-80 py-4"><Suspense><BodyMap levels={levels} /></Suspense></Card>}

      {onEffort ? (
        <Chips label="Como foi hoje?" options={FEELING_LABEL} value={feeling} onChange={(f) => onEffort(f && FEELINGS[f])} />
      ) : <p className="text-center text-meta text-text-2">{feeling ? `Esforço: ${FEELING_LABEL[feeling].toLowerCase()}` : 'Sem esforço registrado'}</p>}

      <Collapsible asChild>
        <Card className="gap-0 py-0">
          <CollapsibleTrigger className="group flex min-h-12 items-center justify-between gap-3 text-body font-semibold text-strong">
            Detalhes
            <ChevronDown size={18} className="text-faint transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-1 border-t border-line py-3">
            {volume.counted > 0 && (
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-text-2">Volume registrado</span>
                <span className="text-right font-semibold text-strong tabular-nums">{`${formatDec(volume.kg)} kg`}
                  {volume.counted < volume.total && <span className="block text-caption font-normal text-faint">{`calculado sobre ${volume.counted} de ${plural(volume.total, 'série', 'séries')}`}</span>}
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 pb-2 text-sm">
              <span className="text-text-2">Séries feitas</span>
              <span className="font-semibold text-strong tabular-nums">{`${stats.done} de ${plannedSets(session)}`}</span>
            </div>
            <div className="flex flex-col">
              {score.rows.map((r, i) => {
                const e = session.exercises[i]
                const record = !!marks.get(e.exerciseId)?.record && !recordShown.has(e.exerciseId)
                if (record) recordShown.add(e.exerciseId)
                return <ExerciseRow key={i} e={e} r={r} record={record} />
              })}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Button variant="outline" className="w-full" onClick={() => setSheet(share())}><Share2 aria-hidden="true" /> Compartilhar</Button>

      {next && (
        <Card className="flex-row items-center gap-3 py-3">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          <div className="text-meta text-text-2">Próximo treino<div className="text-body font-semibold text-strong">{`${next.label} · ${next.name}`}</div></div>
        </Card>
      )}

      {sheet === 'duration' && onEditTimes && session.startedAt && stats.minutes !== null && <DurationSheet startedAt={session.startedAt} minutes={stats.minutes} onSave={(s, e) => { onEditTimes(s, e); setSheet(undefined) }} onClose={() => setSheet(undefined)} />}
      {sheet === 'score' && <ScoreSheet score={score} onClose={() => setSheet(undefined)} />}
      {typeof sheet === 'object' && <ShareSheet input={sheet} onClose={() => setSheet(undefined)} />}
    </>
  )
}
