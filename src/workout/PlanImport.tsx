import { useState } from 'react'
import type { PlanExercise, WorkoutPlan } from './types'
import { usePersisted } from '@/storage/db'
import { catalogOrNull, fetchExercises } from '@/catalog/catalog'
import { EXERCISE_LIST } from '@/catalog/urls'
import { parsePlanFormat, planFromFormat } from './planFormat'
import { buildConvertPrompt, buildPrompt } from './prompt'
import { AnamnesisForm } from './AnamnesisForm'
import { PlanEditor } from './PlanEditor'
import { ExerciseGroups, ExerciseThumb } from './ExerciseGroups'
import { ExercisePreview } from './ExercisePreview'
import { planExerciseLine } from './display'
import { useWorkoutPlan } from './useWorkoutPlan'
import { nextWorkout } from './schedule'
import { savePlan } from './plan'
import { Chips } from '@/components/Chips'
import { plural } from '@/lib/number'
import { BackHeader } from '@/components/BackHeader'
import { CopyListButton, ImportGuide, OutsideCatalog, PasteBox, ReviewActions, ReviewTabs, type ImportMode } from '@/import/ImportFlow'
import { useReplaceConfirm } from '@/import/useReplaceConfirm'
import { usePastedReview } from '@/import/usePastedReview'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function PlanImport({ mode, onDone, onBack }: { mode: ImportMode; onDone: () => void; onBack: () => void }) {
  const { plan, replacePlan } = useWorkoutPlan()
  const [customs, setCustoms] = usePersisted('customExercises')
  const [profile, setProfile] = usePersisted('profile')
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<PlanExercise>()
  const paste = usePastedReview(parsePlanFormat, async (file) => planFromFormat(file, await catalogOrNull(fetchExercises()), customs))
  const review = paste.result
  const [log] = usePersisted('workoutLog')
  const [startLabel, setStartLabel] = useState<string>()
  const suggested = review && nextWorkout(savePlan(plan, review.plan), log)?.label
  const firstLabel = startLabel ?? suggested

  const save = (saved: WorkoutPlan) => {
    const used = new Set(saved.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
    const added = review ? review.newCustoms.filter((c) => used.has(c.id)) : []
    if (added.length) setCustoms((prev) => [...prev, ...added])
    const label = saved.workouts.find((w) => w.label === firstLabel)?.label
    replacePlan(label ? { ...saved, start: { label, since: new Date().toISOString() } } : saved)
    onDone()
  }
  const { offer, dialog: confirm } = useReplaceConfirm(
    (next: WorkoutPlan) => plan.workouts.length > 0 && next.workouts.length > 0, save,
    'Substituir plano?', 'O plano atual será substituído. Seu histórico de treinos continua.',
  )

  if (editing && review) return <><PlanEditor initial={review.plan} onSave={offer} onCancel={() => setEditing(false)} />{confirm}</>

  if (review) {
    const workout = review.plan.workouts[paste.tab] ?? review.plan.workouts[0]
    const noPreview = review.offline ? [] : [...new Set(review.plan.workouts.flatMap((w) => w.exercises.filter((e) => e.custom).map((e) => e.name)))]
    const exCount = review.plan.workouts.reduce((n, w) => n + w.exercises.length, 0)
    return (
      <div className="flex flex-col gap-3 pb-28">
        <BackHeader title="Revisar plano" onBack={() => paste.set('')} className="min-h-11" />
        {review.offline && (
          <Alert role="status" className="flex flex-col items-start gap-1">
            <p>Catálogo indisponível. Você pode revisar o plano sem as prévias dos exercícios.</p>
            <Button type="button" variant="link" size="sm" onClick={() => paste.set(paste.text, true)}>Tentar carregar catálogo</Button>
          </Alert>
        )}
        <ReviewTabs label="Treinos" items={review.plan.workouts} current={workout.id} onPick={paste.setTab} />
        <Card className="text-meta tabular-nums text-text-2">
          {`${plural(review.plan.workouts.length, 'treino', 'treinos')} · ${plural(exCount, 'exercício', 'exercícios')}`}
        </Card>
        {workout && (
          <Card size="flush" role="region" aria-label={workout.name}>
            <div className="flex items-center gap-3 px-3.5 pt-3 pb-1">
              <Badge variant="tile">{workout.label}</Badge>
              <div className="min-w-0">
                <div className="text-body font-semibold text-strong">{workout.name}</div>
                <div className="text-caption text-text-2">{plural(workout.exercises.length, 'exercício', 'exercícios')}</div>
              </div>
            </div>
            <ExerciseGroups
              exercises={workout.exercises}
              className={() => 'pb-1.5'}
              heading="px-3.5 pt-2"
              row={(e, i, cardio) => {
                const image = e.images[0]
                const body = (
                  <>
                    <ExerciseThumb muscles={e.muscles} image={image} cardio={cardio} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body text-strong">{e.name}</span>
                      <span className="block text-caption tabular-nums text-text-2">{planExerciseLine(e)}</span>
                      {e.custom && !review.offline && <span className="block text-caption text-c7">sem prévia (fora do catálogo)</span>}
                    </span>
                  </>
                )
                return image
                  ? <Button key={`${e.exerciseId}-${i}`} type="button" variant="ghost" aria-label={`Ver prévia de ${e.name}`} className="h-auto min-h-11 w-full justify-start gap-3 rounded-none px-3.5 py-1.5 text-left font-normal whitespace-normal" onClick={() => setPreview(e)}>{body}</Button>
                  : <div key={`${e.exerciseId}-${i}`} className="flex min-h-11 items-center gap-3 px-3.5 py-1.5">{body}</div>
              }}
            />
          </Card>
        )}
        <OutsideCatalog title={`${plural(noPreview.length, 'exercício', 'exercícios')} sem prévia (fora do catálogo)`} names={noPreview} />
        {review.plan.workouts.length > 1 && (
          <Chips label="Começar pelo" options={Object.fromEntries(review.plan.workouts.map((w) => [w.label, w.label]))} value={firstLabel} onChange={(v) => v && setStartLabel(v)} />
        )}
        <ReviewActions half="treinos" ignored={review.ignoredDiet} use="Usar plano" onEdit={() => setEditing(true)} onUse={() => offer(review.plan)} />
        {preview && <ExercisePreview exercise={preview} onClose={() => setPreview(undefined)} />}
        {confirm}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-28">
      <BackHeader title={mode === 'ia' ? 'Gerar com IA' : 'Converter ficha'} onBack={onBack} className="min-h-11" />
      <ImportGuide
        mode={mode}
        made="treino"
        source="ficha"
        prompt={() => (mode === 'ia' ? buildPrompt(profile) : buildConvertPrompt())}
      >
        {mode === 'ia' && <AnamnesisForm value={profile.anamnesis ?? {}} onChange={(anamnesis) => setProfile((p) => ({ ...p, anamnesis }))} />}
      </ImportGuide>
      <CopyListButton file={EXERCISE_LIST} noun="exercícios" />
      <PasteBox paste={paste} half="treinos">
        {paste.reviewing && <p role="status" className="text-meta text-text-2">Buscando exercícios no catálogo…</p>}
        {paste.failed && <Alert variant="destructive">Não consegui preparar a revisão. Tente colar ou escolher o arquivo novamente.</Alert>}
      </PasteBox>
    </div>
  )
}
