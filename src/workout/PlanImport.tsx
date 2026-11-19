import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { PlanExercise, WorkoutPlan } from './types'
import { usePersisted } from '@/storage/db'
import { catalogOrNull, fetchExercises } from '@/catalog/catalog'
import { HEADER } from '@/format/envelope'
import { EXERCISE_LIST } from '@/catalog/urls'
import { parsePlanFormat, planFromFormat } from './planFormat'
import { buildConvertPrompt, buildPrompt } from './prompt'
import { AnamnesisForm } from './AnamnesisForm'
import { PlanEditor } from './PlanEditor'
import { ExerciseGroups, ExerciseThumb } from './ExerciseGroups'
import { ExercisePreview } from './ExercisePreview'
import { planExerciseLine } from './display'
import { useWorkoutPlan } from './useWorkoutPlan'
import { plural } from '@/lib/number'
import { namesText } from '@/lib/text'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { CopyListButton, ImportGuide, PasteBox, type ImportMode } from '@/components/ImportFlow'
import { useReplaceConfirm } from '@/components/useReplaceConfirm'
import { usePastedReview } from '@/components/usePastedReview'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

export function PlanImport({ mode, onDone, onBack }: { mode: ImportMode; onDone: () => void; onBack: () => void }) {
  const { plan, replacePlan } = useWorkoutPlan()
  const [customs, setCustoms] = usePersisted('customExercises')
  const [profile, setProfile] = usePersisted('profile')
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState(0)
  const [preview, setPreview] = useState<PlanExercise>()
  const paste = usePastedReview(parsePlanFormat, async (file) => {
    const catalog = await catalogOrNull(fetchExercises())
    return { ...planFromFormat(file, catalog ?? [], customs), offline: catalog === null }
  })
  const review = paste.result

  const edit = (v: string, now?: boolean) => {
    setTab(0)
    paste.set(v, now)
  }

  const save = (saved: WorkoutPlan) => {
    const used = new Set(saved.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
    const added = review && !review.offline ? review.newCustoms.filter((c) => used.has(c.id)) : []
    if (added.length) setCustoms((prev) => [...prev, ...added])
    replacePlan(saved)
    onDone()
  }
  const { offer, dialog: confirm } = useReplaceConfirm(
    (next: WorkoutPlan) => plan.workouts.length > 0 && next.workouts.length > 0, save,
    'Substituir plano?', 'O plano atual será substituído. Seu histórico de treinos continua.',
  )

  if (editing && review) return <><PlanEditor initial={review.plan} onSave={offer} onCancel={() => setEditing(false)} />{confirm}</>

  if (review) {
    const workout = review.plan.workouts[tab] ?? review.plan.workouts[0]
    const noPreview = review.offline ? [] : [...new Set(review.plan.workouts.flatMap((w) => w.exercises.filter((e) => e.custom).map((e) => e.name)))]
    const exCount = review.plan.workouts.reduce((n, w) => n + w.exercises.length, 0)
    return (
      <div className="flex flex-col gap-3 pb-28">
        <BackHeader title="Revisar plano" onBack={() => edit('')} className="min-h-11" />
        {review.offline && (
          <Alert role="status" className="flex flex-col items-start gap-1">
            <p>Catálogo indisponível. Você pode revisar o plano sem as prévias dos exercícios.</p>
            <Button type="button" variant="link" size="sm" onClick={() => paste.set(paste.text, true)}>Tentar carregar catálogo</Button>
          </Alert>
        )}
        {review.plan.workouts.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Treinos">
            {review.plan.workouts.map((w, n) => (
              <Toggle key={w.id} variant="outline" className="shrink-0 text-meta" pressed={w.id === workout.id} onPressedChange={() => setTab(n)}>
                {w.name}
              </Toggle>
            ))}
          </div>
        )}
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
        {noPreview.length > 0 && (
          <Card className="flex-row items-start gap-2 text-meta text-text-2">
            <AlertTriangle size={16} className="mt-px shrink-0 text-c7" aria-hidden="true" />
            <span>
              {`${plural(noPreview.length, 'exercício', 'exercícios')} sem prévia (fora do catálogo)`}
              <span className="block">{namesText(noPreview)}</span>
            </span>
          </Card>
        )}
        {review.ignoredDiet && <p className="text-meta text-text-2">A dieta deste arquivo pode ser importada na aba Dieta</p>}
        <BottomBar className="gap-2">
          <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setEditing(true)}>Editar</Button>
          <Button type="button" className="flex-1" onClick={() => offer(review.plan)}>Usar plano</Button>
        </BottomBar>
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
      <PasteBox text={paste.text} onText={edit} onFile={(t) => edit(t, true)} problems={paste.problems} placeholder={`{ "formato": "${HEADER.formato}", "treinos": ... }`}>
        {paste.reviewing && <p role="status" className="text-meta text-text-2">Buscando exercícios no catálogo…</p>}
        {paste.failed && <Alert variant="destructive">Não consegui preparar a revisão. Tente colar ou escolher o arquivo novamente.</Alert>}
      </PasteBox>
    </div>
  )
}
