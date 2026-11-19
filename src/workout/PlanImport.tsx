import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { WorkoutPlan } from './types'
import { usePersisted } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { PLAN_NOT_FOUND, exportPlanFormat, parsePlanFormat, planFromFormat } from './planFormat'
import { buildConvertPrompt, buildPrompt } from './prompt'
import { AnamnesisForm } from './AnamnesisForm'
import { PlanEditor } from './PlanEditor'
import { plural } from '@/lib/number'
import { namesText } from '@/lib/text'
import { copyText } from '@/lib/share'
import { IconDot } from '@/components/IconDot'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { CopyListButton, PasteBox, Step } from '@/components/ImportFlow'
import { usePastedReview } from '@/components/usePastedReview'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function PlanImport({ mode, onDone, onBack }: { mode: 'ia' | 'convert'; onDone: () => void; onBack: () => void }) {
  const [plan, setPlan] = usePersisted('workoutPlan')
  const [customs, setCustoms] = usePersisted('customExercises')
  const [profile, setProfile] = usePersisted('profile')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const paste = usePastedReview(parsePlanFormat, async (file) => planFromFormat(file, await fetchExercises(), customs), PLAN_NOT_FOUND)
  const review = paste.result

  const copy = async (value: string, ok: string) => setNotice((await copyText(value)) ? ok : 'Não consegui copiar. Tente de novo.')
  const edit = (v: string, now?: boolean) => {
    setNotice('')
    paste.set(v, now)
  }

  const save = (saved: WorkoutPlan) => {
    const used = new Set(saved.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
    const added = review?.newCustoms.filter((c) => used.has(c.id)) ?? []
    if (added.length) setCustoms((prev) => [...prev, ...added])
    setPlan(saved)
    onDone()
  }

  // sem prévia = custom no plano revisado (novo ou já seu), uma vez por nome
  const noPreview = [...new Set(review?.plan.workouts.flatMap((w) => w.exercises.filter((e) => e.custom).map((e) => e.name)))]
  const exCount = review?.plan.workouts.reduce((n, w) => n + w.exercises.length, 0) ?? 0
  if (editing && review) return <PlanEditor initial={review.plan} onSave={save} onCancel={() => setEditing(false)} />

  return (
    <div className="flex flex-col gap-3 pb-28">
      <BackHeader title={mode === 'ia' ? 'Gerar com IA' : 'Converter ficha'} onBack={onBack} className="min-h-11" />
      {mode === 'ia' && <AnamnesisForm value={profile.anamnesis ?? {}} onChange={(anamnesis) => setProfile((p) => ({ ...p, anamnesis }))} />}
      <Card size="flush">
        <Step n={1} title="Copie o prompt" sub={mode === 'ia' ? 'Cole no ChatGPT (e sua ficha, se tiver)' : 'Cole no ChatGPT'}>
          <Button type="button" variant="outline" size="sm" onClick={() => copy(mode === 'ia' ? buildPrompt(profile) : buildConvertPrompt(), 'Prompt copiado. Cole na sua IA.')}><Copy size={14} aria-hidden="true" />Copiar</Button>
        </Step>
        {mode === 'convert' && <Step n={2} title="Mande pra sua IA junto com sua ficha" sub="PDF, foto ou texto" />}
        <Step n={mode === 'ia' ? 2 : 3} title="Cole a resposta aqui" sub={mode === 'ia' ? 'Pode colar o texto todo' : 'Pode colar o texto todo ou escolher o arquivo'} />
      </Card>
      <CopyListButton file="exercicios.txt" noun="exercícios" copy={(t) => copy(t, 'Lista copiada. Cole na sua IA.')} fail={setNotice} />
      <PasteBox text={paste.text} onText={edit} onFile={(t) => edit(t, true)} problems={paste.problems} placeholder='{ "formato": "pump-plano", ... }'>
        {(notice || paste.failed) && <p role="status" className="text-meta text-text-2">{notice || 'Precisa de internet pra casar os exercícios com o catálogo'}</p>}
      </PasteBox>
      {review && (
        <Alert variant="accent" role="status" className="flex items-center gap-3 p-3.5">
          <IconDot size={36} color="var(--color-accent)"><Check size={18} aria-hidden="true" /></IconDot>
          <div>
            <div className="text-body font-semibold text-strong">{`${plural(review.plan.workouts.length, 'treino', 'treinos')} · ${plural(exCount, 'exercício', 'exercícios')}`}</div>
            {noPreview.length > 0 && (
              <div className="text-meta text-text-2">
                <div>{`${plural(noPreview.length, 'exercício', 'exercícios')} sem prévia (fora do catálogo)`}</div>
                <div>{namesText(noPreview)}</div>
              </div>
            )}
          </div>
        </Alert>
      )}
      {review?.ignoredDiet && <p className="text-meta text-text-2">A dieta deste arquivo pode ser importada na aba Dieta</p>}
      {mode === 'ia' && <p className="text-meta text-text-2">Ou ajuste seu plano atual: <Button type="button" variant="link" className="h-auto min-h-11 p-0 text-meta" onClick={() => copy(exportPlanFormat(plan), 'Plano copiado.')}>copiar meu plano</Button></p>}
      <BottomBar>
        <Button type="button" className="w-full" disabled={!review} onClick={() => setEditing(true)}>Revisar plano</Button>
      </BottomBar>
    </div>
  )
}
