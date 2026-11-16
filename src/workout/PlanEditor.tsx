import { useState } from 'react'
import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from 'lucide-react'
import type { PlanExercise, Workout, WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { CatalogPicker } from '../catalog/CatalogPicker'
import { toPlanExercise } from './templates'

const DAYS = [
  ['D', 'Domingo'], ['S', 'Segunda'], ['T', 'Terça'], ['Q', 'Quarta'], ['Q', 'Quinta'], ['S', 'Sexta'], ['S', 'Sábado'],
]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const EMPTY: WorkoutPlan = { workouts: [] }

function Stepper({ label, value, text, step, min, max, onChange }: { label: string; value: number; text: string; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const set = (d: number) => onChange(Math.round(clamp(value + d, min, max) * 10) / 10)
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => set(-step)}><Minus size={16} /></button>
      <span className="stepper-value">{text}</span>
      <button type="button" className="icon-btn" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => set(step)}><Plus size={16} /></button>
    </div>
  )
}

export function PlanEditor({ initial, onDone, onCancel }: { initial?: WorkoutPlan; onDone: () => void; onCancel?: () => void }) {
  const [saved, savePlan] = usePersisted('workoutPlan', EMPTY)
  const [plan, setPlan] = useState<WorkoutPlan>(() => structuredClone(initial ?? saved))
  const [picking, setPicking] = useState<string>() // id do treino que recebe o exercício

  const patchWorkout = (id: string, f: (w: Workout) => Workout) =>
    setPlan((p) => ({ workouts: p.workouts.map((w) => (w.id === id ? f(w) : w)) }))
  const patchEx = (wid: string, i: number, patch: Partial<PlanExercise>) =>
    patchWorkout(wid, (w) => ({ ...w, exercises: w.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))
  const move = (wid: string, i: number, d: number) =>
    patchWorkout(wid, (w) => {
      const ex = [...w.exercises]
      ;[ex[i], ex[i + d]] = [ex[i + d], ex[i]]
      return { ...w, exercises: ex }
    })

  const addWorkout = () =>
    setPlan((p) => {
      const used = new Set(p.workouts.map((w) => w.label))
      const label = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((l) => !used.has(l))
      if (!label) return p
      return { workouts: [...p.workouts, { id: crypto.randomUUID(), label, name: `Treino ${label}`, weekdays: [], exercises: [] }] }
    })

  const save = () => {
    savePlan(plan)
    onDone()
  }

  return (
    <div className="stack">
      {plan.workouts.map((w) => (
        <section key={w.id} className="card stack">
          <div className="row-actions">
            <span className="badge">{w.label}</span>
            <input className="field grow" aria-label={`Nome do treino ${w.label}`} value={w.name} onChange={(e) => patchWorkout(w.id, (x) => ({ ...x, name: e.target.value }))} />
            <button type="button" className="icon-btn" aria-label={`Remover treino ${w.label}`} onClick={() => setPlan((p) => ({ workouts: p.workouts.filter((x) => x.id !== w.id) }))}><Trash2 size={18} /></button>
          </div>
          <div className="chips" role="group" aria-label={`Dias do treino ${w.label}`}>
            {DAYS.map(([short, full], d) => (
              <button
                key={d}
                type="button"
                className="chip day"
                aria-label={full}
                aria-pressed={w.weekdays.includes(d)}
                onClick={() => patchWorkout(w.id, (x) => ({ ...x, weekdays: x.weekdays.includes(d) ? x.weekdays.filter((n) => n !== d) : [...x.weekdays, d].sort() }))}
              >
                {short}
              </button>
            ))}
          </div>
          {w.exercises.map((e, i) => (
            <div key={`${e.exerciseId}-${i}`} className="plan-ex stack">
              <div className="row-actions">
                <span className="grow name">{e.name}</span>
                <button type="button" className="icon-btn" aria-label={`Subir ${e.name}`} disabled={i === 0} onClick={() => move(w.id, i, -1)}><ArrowUp size={18} /></button>
                <button type="button" className="icon-btn" aria-label={`Descer ${e.name}`} disabled={i === w.exercises.length - 1} onClick={() => move(w.id, i, 1)}><ArrowDown size={18} /></button>
                <button type="button" className="icon-btn" aria-label={`Remover ${e.name}`} onClick={() => patchWorkout(w.id, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== i) }))}><Trash2 size={18} /></button>
              </div>
              <div className="controls">
                <Stepper label="séries" value={e.sets} text={`${e.sets}`} step={1} min={1} max={10} onChange={(sets) => patchEx(w.id, i, { sets })} />
                <label className="ctl">reps
                  <input className="field" value={e.reps} onChange={(ev) => patchEx(w.id, i, { reps: ev.target.value })} />
                </label>
                <Stepper label="carga" value={e.weightKg} text={`${e.weightKg} kg`} step={2.5} min={0} max={500} onChange={(weightKg) => patchEx(w.id, i, { weightKg })} />
                <label className="ctl">kg
                  <input className="field" type="number" inputMode="decimal" min={0} max={500} step={0.5} value={e.weightKg} onChange={(ev) => patchEx(w.id, i, { weightKg: clamp(Number(ev.target.value) || 0, 0, 500) })} />
                </label>
                <Stepper label="descanso" value={e.restSec} text={`${e.restSec} s`} step={15} min={15} max={600} onChange={(restSec) => patchEx(w.id, i, { restSec })} />
              </div>
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => setPicking(w.id)}><Plus size={18} /> Adicionar exercício</button>
        </section>
      ))}
      <button type="button" className="btn ghost" onClick={addWorkout}><Plus size={18} /> Adicionar treino</button>
      <div className="row-actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
        <button type="button" className="btn" onClick={save}>Salvar</button>
      </div>
      {picking && (
        <CatalogPicker
          onClose={() => setPicking(undefined)}
          onPick={(e) => {
            patchWorkout(picking, (w) => ({ ...w, exercises: [...w.exercises, toPlanExercise(e)] }))
            setPicking(undefined)
          }}
        />
      )}
    </div>
  )
}
