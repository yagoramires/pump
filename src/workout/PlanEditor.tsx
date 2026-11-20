import { useRef, useState } from 'react'
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import type { PlanExercise, Workout, WorkoutPlan } from './types'
import { CatalogPicker } from './CatalogPicker'
import { toPlanExercise } from './exercises'
import { ExerciseDrawer } from './ExerciseDrawer'
import { ExerciseGroups, ExerciseThumb } from './ExerciseGroups'
import { ExercisePreview } from './ExercisePreview'
import { planProblem } from './planFormat'
import { BackHeader } from '@/components/BackHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { planExerciseLine } from './display'
import { groupExercises } from './reps'
import { useHoldUpdates } from '@/lib/holdUpdates'

type Props = { initial: WorkoutPlan; onSave: (plan: WorkoutPlan) => void; onCancel: () => void }

/** vizinho dentro do próprio grupo (força ou cardio), na ordem em que a tela mostra */
const neighbor = (exercises: PlanExercise[], i: number, d: number) => {
  const items = groupExercises(exercises).find((g) => g.items.some((x) => x.index === i))!.items
  return items[items.findIndex((x) => x.index === i) + d]?.index
}

export function PlanEditor({ initial, onSave, onCancel }: Props) {
  useHoldUpdates()
  const [plan, setPlan] = useState<WorkoutPlan>(() => structuredClone(initial))
  const [picking, setPicking] = useState<string>()
  const [editing, setEditing] = useState<{ wid: string; i: number }>()
  const [preview, setPreview] = useState<PlanExercise>()
  const [menuFor, setMenuFor] = useState<string>()
  const [error, setError] = useState('')
  const renaming = useRef<string>(undefined)

  const patchWorkout = (id: string, f: (w: Workout) => Workout) =>
    setPlan((p) => ({ ...p, workouts: p.workouts.map((w) => (w.id === id ? f(w) : w)) }))
  const patchEx = (wid: string, i: number, patch: Partial<PlanExercise>) =>
    patchWorkout(wid, (w) => ({ ...w, exercises: w.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))
  const move = (wid: string, i: number, d: number) => {
    const w = plan.workouts.find((x) => x.id === wid)!
    const j = neighbor(w.exercises, i, d)
    if (j === undefined) return undefined
    return () => {
      patchWorkout(wid, (x) => {
        const ex = [...x.exercises]
        ;[ex[i], ex[j]] = [ex[j], ex[i]]
        return { ...x, exercises: ex }
      })
      setEditing({ wid, i: j })
    }
  }

  const addWorkout = () =>
    setPlan((p) => {
      const used = new Set(p.workouts.map((w) => w.label))
      const label = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((l) => !used.has(l))
      if (!label) return p
      return { ...p, workouts: [...p.workouts, { id: crypto.randomUUID(), label, name: `Treino ${label}`, exercises: [] }] }
    })

  const save = () => {
    const problem = planProblem(plan)
    if (problem) return setError(problem)
    onSave(plan)
  }

  const ew = editing && plan.workouts.find((w) => w.id === editing.wid)
  const ee = ew?.exercises[editing!.i]
  const mw = plan.workouts.find((w) => w.id === menuFor)

  return (
    <div className="flex flex-col gap-3 pb-6">
      <BackHeader title="Editar plano" onBack={onCancel} label="Cancelar">
        <Button size="sm" onClick={save}>Salvar</Button>
      </BackHeader>
      {error && <Alert variant="destructive">{error}</Alert>}
      {plan.workouts.map((w) => (
        <Card size="sm" key={w.id} className="gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="tile">{w.label}</Badge>
            <Input id={`name-${w.id}`} className="min-w-0 flex-1 border-transparent bg-transparent px-2 font-semibold focus-visible:bg-surface" aria-label={`Nome do treino ${w.label}`} autoComplete="off" enterKeyHint="done" value={w.name} onChange={(e) => patchWorkout(w.id, (x) => ({ ...x, name: e.target.value }))} />
            <Button variant="ghost" size="icon" className="text-text-2" aria-label={`Mais ações do treino ${w.label}`} onClick={() => setMenuFor(w.id)}><MoreHorizontal size={20} /></Button>
          </div>
          <ExerciseGroups
            exercises={w.exercises}
            className={(cardio) => cn('flex flex-col', cardio ? 'gap-2' : 'border-t border-line')}
            heading="border-t border-line pt-2"
            row={(e, i, cardio) => {
              const image = e.images[0]
              return (
                <div key={`${e.exerciseId}-${i}`} className="flex items-center border-t border-line first:border-t-0">
                  {image && (
                    <Button type="button" variant="ghost" size="icon" className="ml-2" aria-label={`Ver prévia de ${e.name}`} onClick={() => setPreview(e)}>
                      <ExerciseThumb muscles={e.muscles} image={image} cardio={cardio} />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" className={cn('h-auto min-h-14 min-w-0 flex-1 justify-start gap-3 rounded-none pr-3 text-left font-normal', image ? 'pl-2' : 'pl-3')} onClick={() => setEditing({ wid: w.id, i })}>
                    {!image && <ExerciseThumb muscles={e.muscles} cardio={cardio} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-strong">{e.name}</span>
                      <span className="block text-caption tabular-nums text-text-2">{planExerciseLine(e)}</span>
                    </span>
                    <span className="shrink-0 text-faint"><ChevronRight size={16} aria-hidden="true" /></span>
                  </Button>
                </div>
              )
            }}
          />
          <Button variant="ghost" className="justify-start text-accent" onClick={() => setPicking(w.id)}><Plus /> Adicionar exercício</Button>
        </Card>
      ))}
      <Button variant="outline" className="border-dashed text-text-2" onClick={addWorkout}><Plus /> Novo treino</Button>
      {preview && <ExercisePreview exercise={preview} onClose={() => setPreview(undefined)} />}
      {ew && ee && (
        <ExerciseDrawer
          ex={ee}
          onChange={(next) => patchEx(ew.id, editing!.i, next)}
          onRemove={() => { patchWorkout(ew.id, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== editing!.i) })); setEditing(undefined) }}
          onMoveUp={move(ew.id, editing!.i, -1)}
          onMoveDown={move(ew.id, editing!.i, 1)}
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
            <Button variant="ghost" className="justify-start text-negative" onClick={() => { setPlan((p) => ({ ...p, workouts: p.workouts.filter((x) => x.id !== menuFor) })); setMenuFor(undefined) }}>Remover treino</Button>
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
