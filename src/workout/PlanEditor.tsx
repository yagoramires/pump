import { useRef, useState } from 'react'
import { ChevronRight, Dumbbell, HeartPulse, MoreHorizontal, Plus } from 'lucide-react'
import type { PlanExercise, Workout, WorkoutPlan } from './types'
import { CatalogPicker } from './CatalogPicker'
import { toPlanExercise } from './exercises'
import { ExerciseDrawer } from './ExerciseDrawer'
import { isCardio } from './cardio'
import { IconDot } from '@/components/IconDot'
import { BackHeader } from '@/components/BackHeader'
import { muscleColor } from '@/catalog/muscles'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { formatKg } from '@/lib/number'
import { cn } from '@/lib/utils'
import { WEEKDAY_SHORT } from '@/lib/date'

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type Props = { initial: WorkoutPlan; onSave: (plan: WorkoutPlan) => void; onCancel: () => void }

export function PlanEditor({ initial, onSave, onCancel }: Props) {
  const [plan, setPlan] = useState<WorkoutPlan>(() => structuredClone(initial))
  const [picking, setPicking] = useState<string>()
  const [editing, setEditing] = useState<{ wid: string; i: number }>()
  const [menuFor, setMenuFor] = useState<string>()
  const renaming = useRef<string>(undefined)

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

  const ew = editing && plan.workouts.find((w) => w.id === editing.wid)
  const ee = ew?.exercises[editing!.i]
  const mw = plan.workouts.find((w) => w.id === menuFor)
  const dash = 'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium'

  return (
    <div className="flex flex-col gap-3 pb-6">
      <BackHeader title="Editar plano" onBack={onCancel} label="Cancelar">
        <Button size="sm" onClick={() => onSave(plan)}>Salvar</Button>
      </BackHeader>
      {plan.workouts.map((w) => (
        <section key={w.id} className="flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-bg text-base font-semibold text-accent">{w.label}</span>
            <input id={`name-${w.id}`} className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-base font-semibold text-strong outline-none focus-visible:bg-surface" aria-label={`Nome do treino ${w.label}`} autoComplete="off" enterKeyHint="done" value={w.name} onChange={(e) => patchWorkout(w.id, (x) => ({ ...x, name: e.target.value }))} />
            <button type="button" className="flex size-11 items-center justify-center text-text-2" aria-label={`Mais ações do treino ${w.label}`} onClick={() => setMenuFor(w.id)}><MoreHorizontal size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Dias do treino ${w.label}`}>
            {DAY_NAMES.map((full, d) => (
              <button
                key={d}
                type="button"
                className={cn('h-11 rounded-[10px] border text-[13px] font-semibold', w.weekdays.includes(d) ? 'border-accent bg-accent text-on-accent' : 'border-border text-text-2')}
                aria-label={full}
                aria-pressed={w.weekdays.includes(d)}
                onClick={() => patchWorkout(w.id, (x) => ({ ...x, weekdays: x.weekdays.includes(d) ? x.weekdays.filter((n) => n !== d) : [...x.weekdays, d].sort() }))}
              >
                {WEEKDAY_SHORT[d][0]}
              </button>
            ))}
          </div>
          {[false, true].map((cardio) => {
            const items = w.exercises.map((e, i) => ({ e, i })).filter(({ e }) => isCardio(e) === cardio)
            return items.length > 0 && (
              <div key={String(cardio)} className="flex flex-col gap-2">
                {cardio && <div className="label-caps border-t border-line pt-2">Cardio</div>}
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
          ex={ee}
          onChange={(next) => patchEx(ew.id, editing!.i, next)}
          onRemove={() => { patchWorkout(ew.id, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== editing!.i) })); setEditing(undefined) }}
          onMoveUp={editing!.i > 0 ? () => { move(ew.id, editing!.i, -1); setEditing({ wid: ew.id, i: editing!.i - 1 }) } : undefined}
          onMoveDown={editing!.i < ew.exercises.length - 1 ? () => { move(ew.id, editing!.i, 1); setEditing({ wid: ew.id, i: editing!.i + 1 }) } : undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
      <Drawer
        open={!!mw}
        onOpenChange={(o) => !o && setMenuFor(undefined)}
        onAnimationEnd={(o) => {
          if (o || !renaming.current) return
          document.getElementById(`name-${renaming.current}`)?.focus()
          renaming.current = undefined
        }}
      >
        <DrawerContent>
          <div className="flex flex-col gap-1 px-4 pb-5">
            <DrawerTitle className="text-[19px] font-semibold text-strong">{mw ? `Treino ${mw.label}` : ''}</DrawerTitle>
            <DrawerDescription className="sr-only">Ações do treino</DrawerDescription>
            <DrawerClose asChild><Button variant="ghost" className="justify-start" onClick={() => { renaming.current = menuFor }}>Renomear</Button></DrawerClose>
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
