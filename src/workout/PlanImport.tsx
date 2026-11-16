import { useState } from 'react'
import type { CustomExercise, WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { fetchCatalog } from '../catalog/catalog'
import { PlanFormatError, LLM_PROMPT, exportPlanFormat, parsePlanFormat, planFromFormat } from './planFormat'

const NO_PLAN: WorkoutPlan = { workouts: [] }
const NO_CUSTOMS: CustomExercise[] = []
type Review = { plan: WorkoutPlan; newCustoms: CustomExercise[]; unmatched: string[]; ignoredDiet: boolean }

export function PlanImport({ onDone }: { onDone: () => void }) {
  const [plan, setPlan, planLoaded] = usePersisted('workoutPlan', NO_PLAN)
  const [customs, setCustoms, customsLoaded] = usePersisted('customExercises', NO_CUSTOMS)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [review, setReview] = useState<Review>()
  const ready = planLoaded && customsLoaded

  const copy = async (value: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(ok)
    } catch {
      setNotice('Não consegui copiar. Tente de novo.')
    }
  }

  const doReview = async () => {
    setReview(undefined)
    setProblems([])
    setNotice('')
    let file
    try {
      file = parsePlanFormat(text)
    } catch (e) {
      setProblems(e instanceof PlanFormatError ? e.problems : ['Não encontrei um plano em JSON no texto'])
      return
    }
    try {
      setReview(planFromFormat(file, await fetchCatalog(), customs))
    } catch {
      setNotice('Precisa de internet pra casar os exercícios com o catálogo')
    }
  }

  const doImport = () => {
    if (!review) return
    setPlan(review.plan)
    if (review.newCustoms.length) setCustoms((prev) => [...prev, ...review.newCustoms])
    onDone()
  }

  return (
    <div className="stack">
      <button type="button" className="btn" onClick={() => copy(LLM_PROMPT, 'Prompt copiado. Cole na sua IA.')}>Copiar prompt pra IA</button>
      <button type="button" className="btn" disabled={!ready} onClick={() => copy(JSON.stringify(exportPlanFormat(plan), null, 2), 'Plano copiado.')}>Copiar meu plano no formato Pump</button>
      <label className="field">
        Cole aqui a resposta da IA
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label className="btn">
        Escolher arquivo
        <input type="file" hidden accept=".json,application/json,text/plain" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) setText(await f.text())
          e.target.value = ''
        }} />
      </label>
      <button type="button" className="btn" disabled={!ready || !text.trim()} onClick={doReview}>Revisar</button>
      {notice && <p className="muted-note" role="status">{notice}</p>}
      {problems.length > 0 && (
        <ul className="stack" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      {review && (
        <div className="card stack">
          <ul>{review.plan.workouts.map((w) => <li key={w.id}>{`Treino ${w.label} — ${w.name}: ${w.exercises.length} ${w.exercises.length === 1 ? 'exercício' : 'exercícios'}`}</li>)}</ul>
          {review.unmatched.length > 0 && <p>Viraram exercícios seus: {review.unmatched.join(', ')}</p>}
          {review.ignoredDiet && <p className="muted-note">A parte de dieta foi ignorada (chega na próxima versão)</p>}
          <button type="button" className="btn" onClick={doImport}>Importar</button>
        </div>
      )}
    </div>
  )
}
