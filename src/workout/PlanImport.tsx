import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { WorkoutPlan } from './types'
import { usePersisted } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { PLAN_NOT_FOUND, exportPlanFormat, parsePlanFormat, planFromFormat } from './planFormat'
import { buildPrompt } from './prompt'
import { AnamnesisForm } from './AnamnesisForm'
import { PlanEditor } from './PlanEditor'
import { plural } from '@/lib/number'
import { copyText } from '@/lib/share'
import { IconDot } from '@/components/IconDot'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { PasteBox, Step } from '@/components/ImportFlow'
import { usePastedReview } from '@/components/usePastedReview'
import { Button } from '@/components/ui/button'

export function PlanImport({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
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

  const exCount = review?.plan.workouts.reduce((n, w) => n + w.exercises.length, 0) ?? 0
  if (editing && review) return <PlanEditor initial={review.plan} onSave={save} onCancel={() => setEditing(false)} />

  return (
    <div className="flex flex-col gap-3 pb-28">
      <BackHeader title="Importar de uma IA" onBack={onBack} className="min-h-11" />
      <AnamnesisForm value={profile.anamnesis ?? {}} onChange={(anamnesis) => setProfile((p) => ({ ...p, anamnesis }))} />
      <div className="overflow-hidden card">
        <Step n={1} title="Copie o prompt" sub="Cole no ChatGPT (e sua ficha, se tiver)">
          <Button type="button" variant="outline" size="sm" className="h-9 bg-transparent" onClick={() => copy(buildPrompt(profile), 'Prompt copiado. Cole na sua IA.')}><Copy size={14} aria-hidden="true" />Copiar</Button>
        </Step>
        <Step n={2} title="Cole a resposta aqui" sub="Pode colar o texto todo" />
      </div>
      <PasteBox text={paste.text} onText={edit} onFile={(t) => edit(t, true)} problems={paste.problems} placeholder='{ "formato": "pump-plano", ... }'>
        {(notice || paste.failed) && <p role="status" className="text-[13px] text-text-2">{notice || 'Precisa de internet pra casar os exercícios com o catálogo'}</p>}
      </PasteBox>
      {review && (
        <div className="flex items-center gap-3 rounded-[14px] border border-accent-line bg-accent-bg p-3.5">
          <IconDot size={36} color="var(--color-accent)"><Check size={18} aria-hidden="true" /></IconDot>
          <div>
            <div className="text-[15px] font-semibold text-strong">{`${plural(review.plan.workouts.length, 'treino', 'treinos')} · ${plural(exCount, 'exercício', 'exercícios')}`}</div>
            {review.unmatched.length > 0 && <div className="text-[13px] text-text-2">{`${review.unmatched.length} viraram exercícios seus`}</div>}
          </div>
        </div>
      )}
      {review?.ignoredDiet && <p className="text-[13px] text-text-2">A dieta deste arquivo pode ser importada na aba Dieta</p>}
      <p className="text-[13px] text-text-2">Ou ajuste seu plano atual: <button type="button" className="min-h-11 font-semibold text-accent" onClick={() => copy(exportPlanFormat(plan), 'Plano copiado.')}>copiar meu plano</button></p>
      <BottomBar>
        <Button type="button" className="w-full" disabled={!review} onClick={() => setEditing(true)}>Revisar plano</Button>
      </BottomBar>
    </div>
  )
}
