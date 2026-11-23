import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DndContext, DragOverlay, closestCorners, pointerWithin, useDroppable, type CollisionDetection, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DEFAULTS } from '@/schema'
import type { DietItem, DietPlan, Macros, Meal, MealOption, Menu } from './types'
import { MACRO_LABELS, optionLabel, optionLetter } from './display'
import { MACRO_KEYS, kcalOf, macrosOf } from './food'
import { currentMenu, emptyMeal, emptyMenu, emptyOption } from './plan'
import { planProblem } from './dietFormat'
import { GOAL_KCAL, MACRO_G, MAX_ITEMS, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'
import { FoodPicker } from './FoodPicker'
import { DietItemCard } from './DietItemCard'
import { macroSplit, moveFood } from './dietEdit'
import { SortableItem } from '@/components/Sortable'
import { LIFTED, PT_ANNOUNCEMENTS, useDragSensors } from '@/components/dnd'
import { SplitBar } from '@/components/SplitBar'
import { BottomBar } from '@/components/BottomBar'
import { Checkbox } from '@/components/ui/checkbox'
import { useSelection } from '@/lib/useSelection'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Chip, ChipRow } from '@/components/ChipRow'
import { Input } from '@/components/ui/input'
import { BackHeader } from '@/components/BackHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NumberField } from '@/components/NumberField'
import { TimePicker } from '@/components/TimePicker'
import { Alert } from '@/components/ui/alert'
import { useHoldUpdates } from '@/lib/holdUpdates'

/** no app: Salvar/Cancelar ("Apagar todos" entrega o plano vazio em `onSave`). Na web (`onChange`): sem cabeçalho, cada mudança sai na hora */
type Props = { initial: DietPlan; onSave?: (plan: DietPlan) => void; onCancel?: () => void; onChange?: (plan: DietPlan) => void }

const MACRO_COLOR = { p: 'var(--color-plate-red)', c: 'var(--color-plate-yellow)', f: 'var(--color-plate-blue)' } as const
const MACRO_WORD = { p: 'proteína', c: 'carboidrato', f: 'gordura' } as const
const TAB = 'tab:'
// a aba da opção é pequena: o que está debaixo do ponteiro ganha; fora de tudo, o mais perto
const collision: CollisionDetection = (args) => { const hit = pointerWithin(args); return hit.length ? hit : closestCorners(args) }

/** aba da opção: também recebe o alimento solto em cima dela */
function OptionTab({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: TAB + id })
  return <span ref={setNodeRef} className={cn('rounded-lg', isOver && 'ring-2 ring-border-strong')}>{children}</span>
}

const CONFIRM = {
  menu: { title: 'Apagar este cardápio?', text: 'As refeições dele saem do editor. O histórico fica.' },
  all: { title: 'Apagar todos os cardápios?', text: 'A aba Dieta volta ao convite. O histórico fica.' },
}

const fresh = <T extends { id: string }>(x: T): T => ({ ...x, id: crypto.randomUUID() })
const copyMenu = (menu: Menu): Menu => {
  const m = structuredClone(menu)
  const meals = m.meals.map((meal) => ({
    ...fresh(meal),
    options: meal.options.map((option) => ({ ...fresh(option), items: option.items.map(fresh) })),
  }))
  return { ...fresh(m), name: `${m.name} (cópia)`, meals }
}
const setMacro = (m: Menu, k: keyof Macros, n?: number): Menu => {
  const g = { ...macrosOf([]), ...m.goalMacros, [k]: n ?? 0 }
  return { ...m, goalMacros: MACRO_KEYS.some((x) => g[x]) ? g : undefined }
}

export function DietEditor({ initial, onSave, onCancel, onChange }: Props) {
  useHoldUpdates()
  const [plan, setPlan] = useState<DietPlan>(() => (initial.menus.length ? structuredClone(initial) : { menus: [emptyMenu(1, [emptyMeal(1)])] }))
  const [menuId, setMenuId] = useState(() => currentMenu(plan)!.id)
  const [optOf, setOptOf] = useState<Record<string, number>>({})
  const [picking, setPicking] = useState<{ mealId: string; oi: number; name: string }>()
  const [confirm, setConfirm] = useState<keyof typeof CONFIRM>()
  const [error, setError] = useState('')
  const [removeMany, setRemoveMany] = useState(false)
  const [dragging, setDragging] = useState<string>()
  const sel = useSelection()
  const sensors = useDragSensors()

  // a web exporta o que está na tela: avisa toda mudança, menos o estado inicial
  const first = useRef(plan)
  const notify = useRef(onChange)
  useEffect(() => { notify.current = onChange })
  useEffect(() => {
    if (plan !== first.current) notify.current?.(plan)
  }, [plan])

  const menu = plan.menus.find((m) => m.id === menuId) ?? plan.menus[0]
  const patchMenu = (f: (m: Menu) => Menu) => setPlan((p) => ({ ...p, menus: p.menus.map((m) => (m.id === menu.id ? f(m) : m)) }))
  const patchMeal = (mealId: string, f: (m: Meal) => Meal) => patchMenu((m) => ({ ...m, meals: m.meals.map((x) => (x.id === mealId ? f(x) : x)) }))
  const patchOption = (mealId: string, oi: number, f: (o: MealOption) => MealOption) =>
    patchMeal(mealId, (m) => ({ ...m, options: m.options.map((o, j) => (j === oi ? f(o) : o)) }))
  const patchItems = (mealId: string, oi: number, f: (items: DietItem[]) => DietItem[]) => patchOption(mealId, oi, (o) => ({ ...o, items: f(o.items) }))

  const addMenu = (m: Menu) => {
    setPlan((p) => ({ ...p, menus: [...p.menus, m] }))
    setMenuId(m.id)
  }
  const removeMenu = () => {
    const rest = plan.menus.filter((m) => m.id !== menu.id)
    setPlan((p) => ({ ...p, menus: rest }))
    setMenuId(rest[0].id)
  }
  const addMeal = () =>
    patchMenu((m) => ({ ...m, meals: [...m.meals, emptyMeal(m.meals.length + 1)] }))
  const addOption = (meal: Meal) => {
    patchMeal(meal.id, (m) => ({ ...m, options: [...m.options, emptyOption()] }))
    setOptOf((o) => ({ ...o, [meal.id]: meal.options.length }))
  }
  const removeOption = (meal: Meal, oi: number) => {
    patchMeal(meal.id, (m) => ({ ...m, options: m.options.filter((_, j) => j !== oi) }))
    setOptOf((o) => ({ ...o, [meal.id]: Math.max(0, oi - 1) }))
  }

  const save = () => {
    const problem = planProblem(plan)
    if (problem) {
      setError(problem.text)
      return setMenuId(problem.menuId)
    }
    onSave?.(plan)
  }
  const confirmed = () => (confirm === 'menu' ? removeMenu() : onSave?.(DEFAULTS.dietPlan))

  /** opção (mostrada) onde está um id do arrasto: alimento, aba ou lista */
  const locate = (m: Menu, id: string) => {
    if (id.startsWith(TAB)) return { optionId: id.slice(TAB.length), index: Infinity }
    for (const o of m.meals.flatMap((x) => x.options)) {
      const index = o.items.findIndex((it) => it.id === id)
      if (index >= 0) return { optionId: o.id, index }
    }
  }
  // alimento passando pra outra refeição: muda de lista já no arrasto; soltar na aba vai pro fim daquela opção
  const dragOver = ({ active, over }: DragOverEvent) => {
    if (!over || String(over.id).startsWith(TAB)) return
    patchMenu((m) => {
      const from = locate(m, String(active.id))
      const to = locate(m, String(over.id))
      return from && to && from.optionId !== to.optionId ? moveFood(m, from, to) : m
    })
  }
  const dragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(undefined)
    if (!over || active.id === over.id) return
    patchMenu((m) => {
      const from = locate(m, String(active.id))
      const to = locate(m, String(over.id))
      if (!from || !to || (from.optionId === to.optionId && to.index === Infinity)) return m
      return moveFood(m, from, to)
    })
  }
  const removeSelected = () => {
    const n = sel.selected.size
    patchMenu((m) => ({ ...m, meals: m.meals.map((ml) => ({ ...ml, options: ml.options.map((o) => ({ ...o, items: o.items.filter((it) => !sel.selected.has(it.id)) })) })) }))
    sel.stop()
    setRemoveMany(false)
    toast(n === 1 ? '1 alimento removido' : `${n} alimentos removidos`)
  }
  const draggedItem = dragging ? menu.meals.flatMap((m) => m.options).flatMap((o) => o.items).find((it) => it.id === dragging) : undefined

  return (
    <div className="flex flex-col gap-3 pb-6">
      {onSave && (
        <BackHeader title="Cardápio" onBack={() => onCancel?.()} label="Cancelar">
          <Button size="sm" onClick={save}>Salvar</Button>
        </BackHeader>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      <ChipRow label="Cardápios" className="-mx-4">
        {plan.menus.map((m) => <Chip key={m.id} pressed={m.id === menu.id} onPressedChange={() => setMenuId(m.id)}>{m.name.trim() || 'Sem nome'}</Chip>)}
        <Button variant="outline" size="sm" className="border-dashed border-border-strong text-text-2" disabled={plan.menus.length >= MAX_MENUS} onClick={() => addMenu(emptyMenu(plan.menus.length + 1))}><Plus aria-hidden="true" /> Novo cardápio</Button>
      </ChipRow>

      <Card size="sm" className="gap-2.5">
        <div className="flex items-center gap-2">
          <Input className="min-w-0 flex-1 font-semibold" aria-label="Nome do cardápio" autoComplete="off" enterKeyHint="done" value={menu.name} onChange={(e) => patchMenu((m) => ({ ...m, name: e.target.value }))} />
          <Button variant="outline" size="icon" aria-label="Duplicar cardápio" disabled={plan.menus.length >= MAX_MENUS} onClick={() => addMenu(copyMenu(menu))}><Copy aria-hidden="true" /></Button>
          <Button variant="outline" size="icon" className="text-negative hover:text-negative" aria-label="Apagar cardápio" disabled={plan.menus.length < 2} onClick={() => setConfirm('menu')}><Trash2 aria-hidden="true" /></Button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="text-sm text-text-2">Meta diária (kcal)</span>
          <NumberField className="w-28 text-center" aria-label="Meta diária em kcal" placeholder="opcional" autoComplete="off" enterKeyHint="done" min={GOAL_KCAL[0]} max={GOAL_KCAL[1]} value={menu.goalKcal} onChange={(n) => n !== null && patchMenu((m) => ({ ...m, goalKcal: n === undefined ? undefined : Math.round(n) }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MACRO_KEYS.map((k) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="label-section">{MACRO_LABELS[k]} (g)</span>
              <NumberField className="text-center" aria-label={`Meta de ${MACRO_LABELS[k].toLowerCase()} em g`} placeholder="—" autoComplete="off" enterKeyHint="done" min={MACRO_G[0]} max={MACRO_G[1]} value={menu.goalMacros?.[k] || undefined} onChange={(n) => n !== null && patchMenu((m) => setMacro(m, k, n))} />
            </label>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-text-2" onClick={sel.on ? sel.stop : sel.start}>{sel.on ? 'Cancelar seleção' : 'Selecionar'}</Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        accessibility={{ announcements: PT_ANNOUNCEMENTS }}
        onDragStart={({ active }) => setDragging(String(active.id))}
        onDragOver={dragOver}
        onDragEnd={dragEnd}
        onDragCancel={() => setDragging(undefined)}
      >
      <div className="@container">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-start @3xl:overflow-x-auto @3xl:pb-2">
      {menu.meals.map((meal, mi) => {
        const oi = Math.min(optOf[meal.id] ?? 0, meal.options.length - 1)
        const opt = meal.options[oi]
        const kcal = kcalOf(opt.items)
        const macros = macroSplit(opt.items)
        return (
          <Card size="sm" key={meal.id} className="gap-2.5 @3xl:w-96 @3xl:shrink-0">
            <div className="flex items-center gap-2">
              <Input className="min-w-0 flex-1 font-semibold" aria-label={`Nome da refeição ${mi + 1}`} autoComplete="off" enterKeyHint="done" value={meal.name} onChange={(e) => patchMeal(meal.id, (m) => ({ ...m, name: e.target.value }))} />
              <TimePicker className="w-28" aria-label={`Horário da refeição ${mi + 1}`} value={meal.time} onChange={(v) => patchMeal(meal.id, (m) => ({ ...m, time: v ?? '' }))} />
              <Button variant="outline" size="icon" aria-label={`Remover refeição ${meal.name}`} onClick={() => patchMenu((m) => ({ ...m, meals: m.meals.filter((x) => x.id !== meal.id) }))}><Trash2 aria-hidden="true" /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {meal.options.map((o, j) => (
                <OptionTab key={o.id} id={o.id}>
                  <Toggle variant="outline" className="px-2.5 text-caption font-semibold" pressed={j === oi} onPressedChange={() => setOptOf((s) => ({ ...s, [meal.id]: j }))}>
                    {optionLabel(j)}
                  </Toggle>
                </OptionTab>
              ))}
              {meal.options.length < MAX_OPTIONS && <Button variant="ghost" size="icon" className="text-accent" aria-label={`Adicionar opção na refeição ${mi + 1}`} onClick={() => addOption(meal)}><Plus aria-hidden="true" /></Button>}
              <span className="ml-auto text-caption tabular-nums text-text-2">{kcal} kcal</span>
            </div>
            <SplitBar parts={macros.map((x) => ({ color: MACRO_COLOR[x.key], value: x.kcal }))} legend={macros.map((x) => `${MACRO_WORD[x.key]} ${Math.round(x.grams)} g`).join(', ')} />
            <div className="flex items-center gap-2">
              <Input className="min-w-0 flex-1" aria-label={`Nome da opção da refeição ${mi + 1}`} placeholder={`Nome da opção ${optionLetter(oi)} (opcional)`} autoComplete="off" value={opt.name ?? ''} onChange={(e) => patchOption(meal.id, oi, (o) => ({ ...o, name: e.target.value || undefined }))} />
              {meal.options.length > 1 && <Button variant="outline" size="icon" aria-label={`Remover opção ${optionLetter(oi)} da refeição ${mi + 1}`} onClick={() => removeOption(meal, oi)}><Trash2 aria-hidden="true" /></Button>}
            </div>
            <SortableContext items={opt.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
              <div className="flex min-h-11 flex-col gap-2" data-option={opt.id}>
                {opt.items.map((it) => (
                  <SortableItem key={it.id} id={it.id} label={it.name} data={{ optionId: opt.id }}>
                    {({ handle }) => (
                      <DietItemCard
                        item={it}
                        onChange={(patch) => patchItems(meal.id, oi, (xs) => xs.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))}
                        onRemove={() => patchItems(meal.id, oi, (xs) => xs.filter((x) => x.id !== it.id))}
                        lead={sel.on && <Checkbox aria-label={`Selecionar ${it.name}`} checked={sel.selected.has(it.id)} onCheckedChange={() => sel.toggle(it.id)} />}
                        trail={!sel.on && handle}
                      />
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
            <Button variant="ghost" className="w-full justify-start text-accent" disabled={opt.items.length >= MAX_ITEMS} onClick={() => setPicking({ mealId: meal.id, oi, name: meal.name })}><Plus aria-hidden="true" /> Alimento</Button>
          </Card>
        )
      })}
      <Button variant="outline" className="min-h-14 w-full border-dashed border-border-strong text-text-2 @3xl:w-60 @3xl:shrink-0" disabled={menu.meals.length >= MAX_MEALS} onClick={addMeal}><Plus aria-hidden="true" /> Refeição</Button>
      </div>
      </div>
        <DragOverlay>
          {draggedItem && <div className={cn('rounded-lg', LIFTED)}><DietItemCard item={draggedItem} onChange={() => {}} onRemove={() => {}} /></div>}
        </DragOverlay>
      </DndContext>

      {onSave && <Button variant="link" className="text-negative hover:text-negative" onClick={() => setConfirm('all')}>Apagar todos os cardápios</Button>}

      {sel.on && (
        <BottomBar className="gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={sel.stop}>Cancelar</Button>
          <Button size="lg" className="flex-1" disabled={!sel.selected.size} onClick={() => setRemoveMany(true)}>{`Remover (${sel.selected.size})`}</Button>
        </BottomBar>
      )}
      <ConfirmDialog
        open={removeMany}
        title={sel.selected.size === 1 ? 'Remover 1 alimento?' : `Remover ${sel.selected.size} alimentos?`}
        text="Eles saem do cardápio. O histórico fica."
        confirm="Remover"
        destructive
        onConfirm={removeSelected}
        onCancel={() => setRemoveMany(false)}
      />

      {picking && (
        <FoodPicker
          title={`Adicionar · ${picking.name}`}
          confirmLabel="Usar"
          onClose={() => setPicking(undefined)}
          onPick={(item) => {
            patchItems(picking.mealId, picking.oi, (xs) => [...xs, item])
            setPicking(undefined)
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirm} title={confirm ? CONFIRM[confirm].title : ''} text={confirm ? CONFIRM[confirm].text : ''} confirm="Apagar" destructive
        onConfirm={confirmed} onCancel={() => setConfirm(undefined)}
      />
    </div>
  )
}
