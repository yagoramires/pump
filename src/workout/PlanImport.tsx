import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, Copy, FileUp } from 'lucide-react'
import type { CustomExercise, WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { fetchCatalog } from '../catalog/catalog'
import { PlanFormatError, LLM_PROMPT, exportPlanFormat, parsePlanFormat, planFromFormat } from './planFormat'
import { IconDot } from '@/components/IconDot'
import { Button } from '@/components/ui/button'

const NO_PLAN: WorkoutPlan = { workouts: [] }
const NO_CUSTOMS: CustomExercise[] = []
type Review = { plan: WorkoutPlan; newCustoms: CustomExercise[]; unmatched: string[]; ignoredDiet: boolean }

function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line p-3.5 first:border-t-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-accent-line bg-accent-bg text-sm font-bold text-accent">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-strong">{title}</div>
        <div className="text-[13px] text-text-2">{sub}</div>
      </div>
      {children}
    </div>
  )
}

export function PlanImport({ onDone, onBack }: { onDone: () => void; onBack?: () => void }) {
  const [plan, setPlan, planLoaded] = usePersisted('workoutPlan', NO_PLAN)
  const [customs, setCustoms, customsLoaded] = usePersisted('customExercises', NO_CUSTOMS)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [review, setReview] = useState<Review>()
  const instant = useRef(false) // arquivo escolhido revisa na hora; digitar espera 400 ms
  const ready = planLoaded && customsLoaded

  const copy = async (value: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(ok)
    } catch {
      setNotice('Não consegui copiar. Tente de novo.')
    }
  }

  const edit = (v: string) => {
    setText(v)
    setReview(undefined)
    setProblems([])
    setNotice('')
  }

  useEffect(() => {
    if (!ready || !text.trim()) return
    let stale = false
    const run = async () => {
      let file
      try {
        file = parsePlanFormat(text)
      } catch (e) {
        if (!stale) setProblems(e instanceof PlanFormatError ? e.problems : ['Não encontrei um plano em JSON no texto'])
        return
      }
      try {
        const r = planFromFormat(file, await fetchCatalog(), customs)
        if (!stale) setReview(r)
      } catch {
        if (!stale) setNotice('Precisa de internet pra casar os exercícios com o catálogo')
      }
    }
    const t = setTimeout(() => void run(), instant.current ? 0 : 400)
    instant.current = false
    return () => { stale = true; clearTimeout(t) }
  }, [text, ready, customs])

  const doImport = () => {
    if (!review) return
    setPlan(review.plan)
    if (review.newCustoms.length) setCustoms((prev) => [...prev, ...review.newCustoms])
    onDone()
  }

  const exCount = review?.plan.workouts.reduce((n, w) => n + w.exercises.length, 0) ?? 0

  return (
    <div className="flex flex-col gap-3 pb-28">
      <header className="flex min-h-11 items-center gap-3 py-2">
        {onBack && <button type="button" className="icon-btn" aria-label="Voltar" onClick={onBack}><ChevronLeft size={18} /></button>}
        <h1 className="flex-1 text-[19px] font-semibold text-strong">Importar de uma IA</h1>
      </header>
      <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
        <Step n={1} title="Copie o prompt" sub="Cole no ChatGPT com sua ficha">
          <Button type="button" variant="outline" size="sm" className="h-9 bg-transparent" onClick={() => copy(LLM_PROMPT, 'Prompt copiado. Cole na sua IA.')}><Copy size={14} aria-hidden="true" />Copiar</Button>
        </Step>
        <Step n={2} title="Cole a resposta aqui" sub="Pode colar o texto todo" />
      </div>
      <textarea
        aria-label="Resposta da IA"
        rows={8}
        className="w-full resize-none rounded-[14px] border border-border bg-panel p-3.5 text-base text-text outline-none placeholder:text-faint focus-visible:border-accent-line"
        placeholder='{ "formato": "pump-plano", ... }'
        value={text}
        onChange={(e) => edit(e.target.value)}
      />
      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">
        <FileUp size={16} aria-hidden="true" />
        Escolher arquivo
        <input type="file" hidden accept=".json,application/json,text/plain" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) { const t = await f.text(); instant.current = t !== text; edit(t) }
          e.target.value = ''
        }} />
      </label>
      {notice && <p role="status" className="text-[13px] text-text-2">{notice}</p>}
      {problems.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-[14px] border border-border bg-panel p-3.5 text-[13px] text-negative">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {review && (
        <div className="flex items-center gap-3 rounded-[14px] border border-accent-line bg-accent-bg p-3.5">
          <IconDot size={36} color="var(--color-accent)"><Check size={18} aria-hidden="true" /></IconDot>
          <div>
            <div className="text-[15px] font-semibold text-strong">{`${review.plan.workouts.length} treinos · ${exCount} exercícios`}</div>
            {review.unmatched.length > 0 && <div className="text-[13px] text-text-2">{`${review.unmatched.length} viraram exercícios seus`}</div>}
          </div>
        </div>
      )}
      {review?.ignoredDiet && <p className="text-[13px] text-text-2">A parte de dieta foi ignorada (chega na próxima versão)</p>}
      <p className="text-[13px] text-text-2">Ou ajuste seu plano atual: <button type="button" className="min-h-11 font-semibold text-accent disabled:opacity-50" disabled={!ready} onClick={() => copy(JSON.stringify(exportPlanFormat(plan), null, 2), 'Plano copiado.')}>copiar meu plano</button></p>
      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="button" className="w-full" disabled={!review} onClick={doImport}>Importar plano</Button>
      </div>
    </div>
  )
}
