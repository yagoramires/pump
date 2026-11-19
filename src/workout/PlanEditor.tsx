import { useRef, useState } from 'react'
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import type { PlanExercise, Workout, WorkoutPlan } from './types'
import { CatalogPicker } from './CatalogPicker'
import { toPlanExercise } from './exercises'
import { ExerciseDrawer } from './ExerciseDrawer'
import { groupExercises } from './cardio'
import { ExerciseIcon } from './ExerciseIcon'
import { ExercisePreview } from './ExercisePreview'
import { imageUrl } from '@/catalog/catalog'
import { BackHeader } from '@/components/BackHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { exerciseSummary, restSecondsLabel } from './display'

type Props = { initial: WorkoutPlan; onSave: (plan: WorkoutPlan) => void; onCancel: () => void }

export function PlanEditor({ initial, onSave, onCancel }: Props) {
  const [plan, setPlan] = useState<WorkoutPlan>(() => structuredClone(initial))
  const [picking, setPicking] = useState<string>()
  const [editing, setEditing] = useState<{ wid: string; i: number }>()
  const [preview, setPreview] = useState<PlanExercise>()
  const [menuFor, setMenuFor] = useState<string>()
  const renaming = useRef<string>(undefined)
  const previewTrigger = useRef<HTMLButtonElement>(null)

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
      return { workouts: [...p.workouts, { id: crypto.randomUUID(), label, name: `Treino ${label}`, exercises: [] }] }
    })

  const ew = editing && plan.workouts.find((w) => w.id === editing.wid)
  const ee = ew?.exercises[editing!.i]
  const mw = plan.workouts.find((w) => w.id === menuFor)

  return (
    <div className="flex flex-col gap-3 pb-6">
      <BackHeader title="Editar plano" onBack={onCancel} label="Cancelar">
        <Button size="sm" onClick={() => onSave(plan)}>Salvar</Button>
      </BackHeader>
      {plan.workouts.map((w) => (
        <Card size="sm" key={w.id} className="gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="tile">{w.label}</Badge>
            <Input id={`name-${w.id}`} className="min-w-0 flex-1 border-transparent bg-transparent px-2 font-semibold focus-visible:bg-surface" aria-label={`Nome do treino ${w.label}`} autoComplete="off" enterKeyHint="done" value={w.name} onChange={(e) => patchWorkout(w.id, (x) => ({ ...x, name: e.target.value }))} />
            <Button variant="ghost" size="icon" className="text-text-2" aria-label={`Mais ações do treino ${w.label}`} onClick={() => setMenuFor(w.id)}><MoreHorizontal size={20} /></Button>
          </div>
          {Object.entries(groupExercises(w.exercises)).map(([kind, items]) => {
            const cardio = kind === 'cardio'
            return items.length > 0 && (
              <div key={kind} className={cn('flex flex-col', cardio ? 'gap-2' : 'border-t border-line')}>
                {cardio && <div className="label-caps border-t border-line pt-2">Cardio</div>}
                {items.map(({ exercise: e, index: i }) => {
                  const image = e.images[0]
                  return (
                    <div key={`${e.exerciseId}-${i}`} className="flex items-center border-t border-line first:border-t-0">
                      {image && (
                        <Button type="button" variant="ghost" size="icon" className="relative ml-2" aria-label={`Ver prévia de ${e.name}`} onClick={(event) => { previewTrigger.current = event.currentTarget; setPreview(e) }}>
                          <ExerciseIcon muscles={e.muscles} cardio={cardio} size={36} />
                          <img key={image} src={imageUrl(image)} alt="" loading="lazy" className="absolute size-9 rounded-lg bg-surface object-cover" onError={(event) => { event.currentTarget.hidden = true }} />
                        </Button>
                      )}
                      <Button type="button" variant="ghost" className={cn('h-auto min-h-14 min-w-0 flex-1 justify-start gap-3 rounded-none pr-3 text-left font-normal', image ? 'pl-2' : 'pl-3')} onClick={() => setEditing({ wid: w.id, i })}>
                        {!image && <ExerciseIcon muscles={e.muscles} cardio={cardio} size={36} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body font-semibold text-strong">{e.name}</span>
                          <span className="block text-caption tabular-nums text-text-2">{cardio ? e.reps : `${exerciseSummary(e)} · ${restSecondsLabel(e.restSec)}`}</span>
                        </span>
                        <span className="shrink-0 text-faint"><ChevronRight size={16} aria-hidden="true" /></span>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )
          })}
          <Button variant="ghost" className="justify-start text-accent" onClick={() => setPicking(w.id)}><Plus /> Adicionar exercício</Button>
        </Card>
      ))}
      <Button variant="outline" className="border-dashed text-text-2" onClick={addWorkout}><Plus /> Novo treino</Button>
      {preview && (
        <ExercisePreview
          exercise={preview}
          onClose={() => setPreview(undefined)}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            previewTrigger.current?.focus()
          }}
        />
      )}
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
            <DrawerTitle className="text-title font-semibold text-strong">{mw ? `Treino ${mw.label}` : ''}</DrawerTitle>
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
