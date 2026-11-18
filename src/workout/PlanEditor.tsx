import { useState } from 'react'
import { ChevronLeft, ChevronRight, Dumbbell, HeartPulse, MoreHorizontal, Plus } from 'lucide-react'
import type { PlanExercise, Workout, WorkoutPlan } from './types'
import { usePersisted } from '../storage/db'
import { CatalogPicker } from '../catalog/CatalogPicker'
import { toPlanExercise } from './templates'
import { ExerciseDrawer } from './ExerciseDrawer'
import { isCardio } from './cardio'
import { IconDot } from '@/components/IconDot'
import { muscleColor } from '@/components/muscleColor'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { formatKg } from '@/lib/number'
import { cn } from '@/lib/utils'

const DAYS = [
  ['D', 'Domingo'], ['S', 'Segunda'], ['T', 'Terça'], ['Q', 'Quarta'], ['Q', 'Quinta'], ['S', 'Sexta'], ['S', 'Sábado'],
]

type Props = { initial?: WorkoutPlan; onDone: (plan: WorkoutPlan) => void; onCancel?: () => void }

export function PlanEditor({ initial, onDone, onCancel }: Props) {
  const [saved, savePlan] = usePersisted('workoutPlan')
  const [plan, setPlan] = useState<WorkoutPlan>(() => structuredClone(initial ?? saved))
  const [picking, setPicking] = useState<string>() // id do treino que recebe o exercício
  const [editing, setEditing] = useState<{ wid: string; i: number }>()
  const [menuFor, setMenuFor] = useState<string>() // id do treino com o menu ⋯ aberto

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
    onDone(plan)
  }

  const ew = editing && plan.workouts.find((w) => w.id === editing.wid)
  const ee = ew?.exercises[editing!.i]
  const mw = plan.workouts.find((w) => w.id === menuFor)
  const dash = 'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium'

  return (
    <div className="flex flex-col gap-3 pb-6">
      <header className="flex items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Cancelar" onClick={onCancel}><ChevronLeft size={18} /></button>
        <h1 className="flex-1 text-[19px] font-semibold text-strong">Editar plano</h1>
        <Button size="sm" onClick={save}>Salvar</Button>
      </header>
      {plan.workouts.map((w) => (
        <section key={w.id} className="flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-bg text-base font-semibold text-accent">{w.label}</span>
            <input id={`name-${w.id}`} className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-base font-semibold text-strong outline-none focus-visible:bg-surface" aria-label={`Nome do treino ${w.label}`} autoComplete="off" enterKeyHint="done" value={w.name} onChange={(e) => patchWorkout(w.id, (x) => ({ ...x, name: e.target.value }))} />
            <button type="button" className="flex size-11 items-center justify-center text-text-2" aria-label={`Mais ações do treino ${w.label}`} onClick={() => setMenuFor(w.id)}><MoreHorizontal size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Dias do treino ${w.label}`}>
            {DAYS.map(([short, full], d) => (
              <button
                key={d}
                type="button"
                className={cn('h-11 rounded-[10px] border text-[13px] font-semibold', w.weekdays.includes(d) ? 'border-accent bg-accent text-on-accent' : 'border-border text-text-2')}
                aria-label={full}
                aria-pressed={w.weekdays.includes(d)}
                onClick={() => patchWorkout(w.id, (x) => ({ ...x, weekdays: x.weekdays.includes(d) ? x.weekdays.filter((n) => n !== d) : [...x.weekdays, d].sort() }))}
              >
                {short}
              </button>
            ))}
          </div>
          {[false, true].map((cardio) => {
            const items = w.exercises.map((e, i) => ({ e, i })).filter(({ e }) => isCardio(e) === cardio)
            return items.length > 0 && (
              <div key={String(cardio)} className="flex flex-col gap-2">
                {cardio && <div className="border-t border-line pt-2 text-[10px] font-semibold tracking-[.05em] text-faint uppercase">Cardio</div>}
                {items.map(({ e, i }) => (
                  <button key={`${e.exerciseId}-${i}`} type="button" className={cn('flex min-h-14 items-center gap-3 text-left', !cardio && 'border-t border-line pt-2')} onClick={() => setEditing({ wid: w.id, i })}>
                    <IconDot color={cardio ? 'var(--c1)' : muscleColor(e.muscles)} size={36}>{cardio ? <HeartPulse size={16} /> : <Dumbbell size={16} />}</IconDot>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-strong">{e.name}</span>
                      <span className="block text-[12.5px] tabular-nums text-text-2">{cardio ? e.reps : `${e.sets} × ${e.reps} · ${formatKg(e.weightKg)} kg · ${e.restSec} s`}</span>
                    </span>
                    <ChevronRight size={16} className="text-faint" />
                  </button>
                ))}
              </div>
            )
          })}
          <button type="button" className={cn(dash, 'justify-start text-accent')} onClick={() => setPicking(w.id)}><Plus size={18} /> Adicionar exercício</button>
        </section>
      ))}
      <button type="button" className={cn(dash, 'border border-dashed border-border-strong text-text-2')} onClick={addWorkout}><Plus size={18} /> Novo treino</button>
      {ew && ee && (
        <ExerciseDrawer
          open
          ex={ee}
          onChange={(next) => patchEx(ew.id, editing!.i, next)}
          onRemove={() => { patchWorkout(ew.id, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== editing!.i) })); setEditing(undefined) }}
          onMoveUp={editing!.i > 0 ? () => { move(ew.id, editing!.i, -1); setEditing({ wid: ew.id, i: editing!.i - 1 }) } : undefined}
          onMoveDown={editing!.i < ew.exercises.length - 1 ? () => { move(ew.id, editing!.i, 1); setEditing({ wid: ew.id, i: editing!.i + 1 }) } : undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
      <Drawer open={!!mw} onOpenChange={(o) => !o && setMenuFor(undefined)}>
        <DrawerContent>
          <div className="flex flex-col gap-1 px-4 pb-5">
            <DrawerTitle className="text-[19px] font-semibold text-strong">{mw ? `Treino ${mw.label}` : ''}</DrawerTitle>
            <DrawerDescription className="sr-only">Ações do treino</DrawerDescription>
            <Button variant="ghost" className="justify-start" onClick={() => { const id = menuFor; setMenuFor(undefined); setTimeout(() => document.getElementById(`name-${id}`)?.focus(), 300) }}>Renomear</Button>
            <Button variant="ghost" className="justify-start text-negative" onClick={() => { setPlan((p) => ({ workouts: p.workouts.filter((x) => x.id !== menuFor) })); setMenuFor(undefined) }}>Remover treino</Button>
          </div>
        </DrawerContent>
      </Drawer>
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
