import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DndContext, DragOverlay, closestCorners, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PlanExercise, WorkoutPlan } from './types'
import { CatalogPicker } from './CatalogPicker'
import { toPlanExercise } from './exercises'
import { ExerciseDrawer } from './ExerciseDrawer'
import { ExercisePreview } from './ExercisePreview'
import { PlanExerciseCard } from './PlanExerciseCard'
import { planProblem } from './planFormat'
import { addWorkout, fromEditor, moveExercise, moveWorkout, muscleSplit, removeWorkout, toEditor, type EditorPlan, type EditorWorkout, type Keyed } from './planEdit'
import { groupColor } from '@/catalog/muscles'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SortableItem } from '@/components/Sortable'
import { LIFTED, PT_ANNOUNCEMENTS, useDragSensors } from '@/components/dnd'
import { SplitBar } from '@/components/SplitBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { useHoldUpdates } from '@/lib/holdUpdates'
import { useSelection } from '@/lib/useSelection'
import { cn } from '@/lib/utils'

/** no app: Salvar/Cancelar. Na web (`onChange`): sem cabeçalho, cada mudança sai na hora */
type Props = { initial: WorkoutPlan; onSave?: (plan: WorkoutPlan) => void; onCancel?: () => void; onChange?: (plan: WorkoutPlan) => void }

const WID = 'w:'
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function PlanEditor({ initial, onSave, onCancel, onChange }: Props) {
  useHoldUpdates()
  const [plan, setPlan] = useState<EditorPlan>(() => toEditor(structuredClone(initial)))
  const [picking, setPicking] = useState<string>()
  const [editing, setEditing] = useState<string>()
  const [preview, setPreview] = useState<PlanExercise>()
  const [menuFor, setMenuFor] = useState<string>()
  const [confirm, setConfirm] = useState<'many'>()
  const [removeId, setRemoveId] = useState<string>()
  const [dragging, setDragging] = useState<string>()
  const [error, setError] = useState('')
  // ação escolhida no menu do treino: roda depois que a gaveta fecha (dois modais juntos deixam a tela escondida)
  const after = useRef<{ act: 'rename' | 'remove'; id: string }>(undefined)
  const sel = useSelection()
  const sensors = useDragSensors()

  // a web exporta o que está na tela: avisa toda mudança, menos o estado inicial
  const first = useRef(plan)
  const notify = useRef(onChange)
  useEffect(() => { notify.current = onChange })
  useEffect(() => {
    if (plan !== first.current) notify.current?.(fromEditor(plan))
  }, [plan])

  const patchWorkout = (id: string, f: (w: EditorWorkout) => EditorWorkout) =>
    setPlan((p) => ({ ...p, workouts: p.workouts.map((w) => (w.id === id ? f(w) : w)) }))
  const patchEx = (key: string, patch: Partial<PlanExercise>) =>
    setPlan((p) => ({ ...p, workouts: p.workouts.map((w) => ({ ...w, exercises: w.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) })) }))
  const removeKeys = (keys: Set<string>) =>
    setPlan((p) => ({ ...p, workouts: p.workouts.map((w) => ({ ...w, exercises: w.exercises.filter((e) => !keys.has(e.key)) })) }))

  /** onde está cada id do arrasto: treino (índice -1) ou exercício */
  const locate = (p: EditorPlan, id: string) => {
    if (id.startsWith(WID)) return { wid: id.slice(WID.length), index: -1 }
    for (const w of p.workouts) {
      const index = w.exercises.findIndex((e) => e.key === id)
      if (index >= 0) return { wid: w.id, index }
    }
  }

  // exercício passando pra outro treino: muda de lista já durante o arrasto, pra lista de destino abrir espaço
  const dragOver = ({ active, over }: DragOverEvent) => {
    const a = String(active.id)
    if (!over || a.startsWith(WID)) return
    setPlan((p) => {
      const from = locate(p, a)
      const to = locate(p, String(over.id))
      if (!from || !to || from.wid === to.wid) return p
      const size = p.workouts.find((w) => w.id === to.wid)!.exercises.length
      return moveExercise(p, from, { wid: to.wid, index: to.index < 0 ? size : to.index })
    })
  }

  const dragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(undefined)
    if (!over || active.id === over.id) return
    const a = String(active.id)
    const o = String(over.id)
    setPlan((p) => {
      if (a.startsWith(WID)) {
        const to = locate(p, o)
        const from = p.workouts.findIndex((w) => WID + w.id === a)
        const toIndex = to ? p.workouts.findIndex((w) => w.id === to.wid) : -1
        return from < 0 || toIndex < 0 ? p : moveWorkout(p, from, toIndex)
      }
      const from = locate(p, a)
      const to = locate(p, o)
      if (!from || !to || from.wid !== to.wid || to.index < 0) return p
      return moveExercise(p, from, to)
    })
  }

  const save = () => {
    const saved = fromEditor(plan)
    const problem = planProblem(saved)
    if (problem) return setError(problem)
    onSave?.(saved)
  }

  const removeSelected = () => {
    const n = sel.selected.size
    removeKeys(sel.selected)
    sel.stop()
    setConfirm(undefined)
    toast(plural(n, 'exercício removido', 'exercícios removidos'))
  }

  const all = plan.workouts.flatMap((w) => w.exercises)
  const ee = all.find((e) => e.key === editing)
  const mw = plan.workouts.find((w) => w.id === menuFor)
  const rw = plan.workouts.find((w) => w.id === removeId)
  const dragged: Keyed | EditorWorkout | undefined = dragging?.startsWith(WID)
    ? plan.workouts.find((w) => WID + w.id === dragging)
    : all.find((e) => e.key === dragging)

  return (
    <div className="@container flex flex-col gap-3 pb-6">
      {onSave && (
        <BackHeader title="Editar plano" onBack={() => onCancel?.()} label="Cancelar">
          <Button size="sm" onClick={save}>Salvar</Button>
        </BackHeader>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-text-2" onClick={sel.on ? sel.stop : sel.start}>{sel.on ? 'Cancelar seleção' : 'Selecionar'}</Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements: PT_ANNOUNCEMENTS }}
        onDragStart={({ active }: DragStartEvent) => setDragging(String(active.id))}
        onDragOver={dragOver}
        onDragEnd={dragEnd}
        onDragCancel={() => setDragging(undefined)}
      >
        <SortableContext items={plan.workouts.map((w) => WID + w.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-start @3xl:overflow-x-auto @3xl:pb-2">
            {plan.workouts.map((w) => {
              const split = muscleSplit(w.exercises)
              return (
                <SortableItem key={w.id} id={WID + w.id} label={`treino ${w.label}`} className="@3xl:w-80 @3xl:shrink-0">
                  {({ handle }) => (
                    <Card size="sm" className="gap-2">
                      <div className="flex items-center gap-1">
                        {!sel.on && handle}
                        <Badge variant="tile">{w.label}</Badge>
                        <Input id={`name-${w.id}`} className="min-w-0 flex-1 border-transparent bg-transparent px-2 font-bold text-strong focus-visible:bg-surface" aria-label={`Nome do treino ${w.label}`} autoComplete="off" enterKeyHint="done" value={w.name} onChange={(e) => patchWorkout(w.id, (x) => ({ ...x, name: e.target.value }))} />
                        <span className="shrink-0 text-caption text-text-2">{w.exercises.length}</span>
                        <Button variant="ghost" size="icon" className="text-text-2" aria-label={`Mais ações do treino ${w.label}`} onClick={() => setMenuFor(w.id)}><MoreHorizontal size={20} /></Button>
                      </div>
                      <SplitBar parts={split.map((s) => ({ color: groupColor(s.token), value: s.count }))} legend={split.map((s) => `${s.label} ${s.count}`).join(', ')} />
                      <SortableContext items={w.exercises.map((e) => e.key)} strategy={verticalListSortingStrategy}>
                        <div className="flex min-h-11 flex-col gap-2">
                          {w.exercises.map((e) => (
                            <SortableItem key={e.key} id={e.key} label={e.name}>
                              {({ handle: exHandle }) => (
                                <PlanExerciseCard
                                  ex={e}
                                  onChange={(patch) => patchEx(e.key, patch)}
                                  onOpen={() => setEditing(e.key)}
                                  onPreview={() => setPreview(e)}
                                  lead={sel.on && <Checkbox aria-label={`Selecionar ${e.name}`} checked={sel.selected.has(e.key)} onCheckedChange={() => sel.toggle(e.key)} />}
                                  trail={!sel.on && exHandle}
                                />
                              )}
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>
                      <Button variant="ghost" className="justify-start text-accent" onClick={() => setPicking(w.id)}><Plus /> Adicionar exercício</Button>
                    </Card>
                  )}
                </SortableItem>
              )
            })}
            <Button variant="outline" className="min-h-14 border-dashed border-border-strong text-text-2 @3xl:w-60 @3xl:shrink-0" aria-label="Novo treino" onClick={() => setPlan(addWorkout)}><Plus /> Novo treino</Button>
          </div>
        </SortableContext>
        <DragOverlay>
          {dragged && ('key' in dragged
            ? <div className={cn('rounded-lg', LIFTED)}><PlanExerciseCard ex={dragged} onChange={() => {}} onOpen={() => {}} /></div>
            : <Card size="sm" className={LIFTED}><div className="flex items-center gap-2"><Badge variant="tile">{dragged.label}</Badge><span className="font-bold text-strong">{dragged.name}</span></div></Card>)}
        </DragOverlay>
      </DndContext>

      {sel.on && (
        <BottomBar className="gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={sel.stop}>Cancelar</Button>
          <Button size="lg" className="flex-1" disabled={!sel.selected.size} onClick={() => setConfirm('many')}>{`Remover (${sel.selected.size})`}</Button>
        </BottomBar>
      )}

      {preview && <ExercisePreview exercise={preview} onClose={() => setPreview(undefined)} />}
      {ee && (
        <ExerciseDrawer
          ex={ee}
          onChange={(next) => patchEx(ee.key, next)}
          onRemove={() => { removeKeys(new Set([ee.key])); setEditing(undefined) }}
          onClose={() => setEditing(undefined)}
        />
      )}
      <Drawer
        open={!!mw}
        onOpenChange={(o) => !o && setMenuFor(undefined)}
        onAnimationEnd={(o) => {
          const a = after.current
          if (o || !a) return
          after.current = undefined
          if (a.act === 'rename') document.getElementById(`name-${a.id}`)?.focus()
          else setRemoveId(a.id)
        }}
      >
        <DrawerContent>
          <div className="flex flex-col gap-1 px-4 pb-5">
            <DrawerTitle className="text-title font-semibold text-strong">{mw ? `Treino ${mw.label}` : ''}</DrawerTitle>
            <DrawerDescription className="sr-only">Ações do treino</DrawerDescription>
            <DrawerClose asChild><Button variant="ghost" className="justify-start" onClick={() => { after.current = menuFor ? { act: 'rename', id: menuFor } : undefined }}>Renomear</Button></DrawerClose>
            <DrawerClose asChild><Button variant="ghost" className="justify-start text-negative" onClick={() => { after.current = menuFor ? { act: 'remove', id: menuFor } : undefined }}>Remover treino</Button></DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
      <ConfirmDialog
        open={!!rw}
        title={rw ? `Remover o treino ${rw.label}?` : ''}
        text="Os exercícios dele saem do plano. O histórico fica."
        confirm="Remover"
        destructive
        onConfirm={() => { if (removeId) setPlan((p) => removeWorkout(p, removeId)); setRemoveId(undefined) }}
        onCancel={() => setRemoveId(undefined)}
      />
      <ConfirmDialog
        open={confirm === 'many'}
        title={`Remover ${plural(sel.selected.size, 'exercício', 'exercícios')}?`}
        text="Eles saem do plano. O histórico fica."
        confirm="Remover"
        destructive
        onConfirm={removeSelected}
        onCancel={() => setConfirm(undefined)}
      />
      {picking && (
        <CatalogPicker
          onClose={() => setPicking(undefined)}
          onPick={(e) => {
            patchWorkout(picking, (w) => ({ ...w, exercises: [...w.exercises, { ...toPlanExercise(e), key: crypto.randomUUID() }] }))
            setPicking(undefined)
          }}
        />
      )}
    </div>
  )
}
