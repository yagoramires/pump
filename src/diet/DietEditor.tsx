import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, Copy, Plus, Share2, Trash2 } from 'lucide-react'
import { DEFAULTS } from '../schema'
import type { DietItem, DietLog, DietPlan, Macros, Meal, MealOption, Menu } from './types'
import { usePersisted } from '../storage/db'
import { currentMenu, ensureDay, iaLabel, itemKcal, optionLetter, sortedMeals } from './day'
import { exportDietFormat } from './dietFormat'
import { GOAL_KCAL, GRAMS, HHMM, MACRO_G, MAX_ITEMS, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'
import { FoodPicker } from './FoodPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { todayKey } from '@/lib/date'
import { formatInput, parseDecimal } from '@/lib/number'
import { cn } from '@/lib/utils'

/** `confirmReplace`: pede confirmação antes de salvar por cima de cardápios já salvos (vindo da importação) */
type Props = { initial?: DietPlan; confirmReplace?: boolean; onDone: () => void; onCancel: () => void }
type Setter<T> = (v: T | ((prev: T) => T)) => void

const LABEL = 'text-[10px] font-semibold uppercase tracking-[.04em] text-faint'
const CONFIRM = {
  menu: { title: 'Apagar este cardápio?', text: 'As refeições dele saem do editor. O histórico fica.' },
  all: { title: 'Apagar todos os cardápios?', text: 'A aba Dieta volta ao convite. O histórico fica.' },
  replace: { title: 'Substituir cardápio?', text: 'O cardápio atual será substituído. O que você já marcou hoje continua.' },
}

const uuid = () => crypto.randomUUID()
const fresh = <T extends { id: string }>(x: T): T => ({ ...x, id: uuid() })
const newMenu = (n: number): Menu => ({ id: uuid(), name: `Cardápio ${n}`, meals: [] })
const copyMenu = (m: Menu): Menu => {
  const c = structuredClone(m)
  return { ...fresh(c), name: `${m.name} (cópia)`, meals: c.meals.map((ml) => ({ ...fresh(ml), options: ml.options.map((o) => ({ ...fresh(o), items: o.items.map(fresh) })) })) }
}
const setMacro = (m: Menu, k: keyof Macros, n?: number): Menu => {
  const g = { p: 0, c: 0, f: 0, ...m.goalMacros, [k]: n ?? 0 }
  return { ...m, goalMacros: g.p || g.c || g.f ? g : undefined }
}
const problemOf = (plan: DietPlan): { menuId: string; text: string } | undefined => {
  for (const m of plan.menus) {
    const n = m.name.trim()
    const text = !n ? 'Dê um nome a cada cardápio'
      : !m.meals.length ? `${n}: adicione uma refeição`
      : m.meals.some((ml) => !ml.name.trim() || !HHMM.test(ml.time)) ? `${n}: preencha nome e horário (HH:MM) de cada refeição`
      : m.meals.some((ml) => ml.options.some((o) => !o.items.length)) ? `${n}: cada opção precisa de ao menos 1 alimento`
      : m.goalKcal !== undefined && (m.goalKcal < GOAL_KCAL[0] || m.goalKcal > GOAL_KCAL[1]) ? `${n}: meta fora da faixa (${GOAL_KCAL[0]} a ${GOAL_KCAL[1]} kcal)`
      : m.goalMacros && Object.values(m.goalMacros).some((g) => g < MACRO_G[0] || g > MACRO_G[1]) ? `${n}: macros fora da faixa (${MACRO_G[0]} a ${MACRO_G[1]} g)`
      : ''
    if (text) return { menuId: m.id, text }
  }
}
const tidy = (s?: string) => s?.trim() || undefined
const tidyPlan = (plan: DietPlan): DietPlan => ({
  ...plan,
  menus: plan.menus.map((m) => ({
    ...m,
    name: m.name.trim(),
    meals: sortedMeals(m.meals).map((ml) => ({
      ...ml,
      name: ml.name.trim(),
      options: ml.options.map((o) => ({ ...o, name: tidy(o.name), items: o.items.map((i) => ({ ...i, portion: tidy(i.portion) })) })),
    })),
  })),
})

/** texto livre com vírgula; vazio = sem valor. Usar com `key` pra reiniciar quando o valor muda por fora */
function NumField({ value, onChange, label, className, placeholder }: { value?: number; onChange: (n?: number) => void; label: string; className?: string; placeholder?: string }) {
  const [text, setText] = useState(value === undefined ? '' : formatInput(value))
  return (
    <Input
      className={className}
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      autoComplete="off"
      enterKeyHint="done"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseDecimal(e.target.value)
        if (!e.target.value.trim()) onChange(undefined)
        else if (n !== null) onChange(n)
      }}
    />
  )
}

export function DietEditor(props: Props) {
  const [saved, savePlan] = usePersisted('dietPlan')
  const [, setLog] = usePersisted('dietLog')
  return <DietForm {...props} start={props.initial ?? saved} replacing={!!props.confirmReplace && saved.menus.length > 0} savePlan={savePlan} setLog={setLog} />
}

function DietForm({ start, replacing, onDone, onCancel, savePlan, setLog }: Props & { start: DietPlan; replacing: boolean; savePlan: Setter<DietPlan>; setLog: Setter<DietLog> }) {
  const [plan, setPlan] = useState<DietPlan>(() => (start.menus.length ? structuredClone(start) : { menus: [newMenu(1)] }))
  const [menuId, setMenuId] = useState(() => currentMenu(plan)!.id)
  const [optOf, setOptOf] = useState<Record<string, number>>({}) // aba de opção aberta em cada refeição
  const [picking, setPicking] = useState<{ mealId: string; oi: number; name: string }>()
  const [confirm, setConfirm] = useState<keyof typeof CONFIRM>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
    patchMenu((m) => ({ ...m, meals: [...m.meals, { id: uuid(), name: `Refeição ${m.meals.length + 1}`, time: '', options: [{ id: uuid(), items: [] }] }] }))
  const addOption = (meal: Meal) => {
    patchMeal(meal.id, (m) => ({ ...m, options: [...m.options, { id: uuid(), items: [] }] }))
    setOptOf((o) => ({ ...o, [meal.id]: meal.options.length }))
  }
  const removeOption = (meal: Meal, oi: number) => {
    patchMeal(meal.id, (m) => ({ ...m, options: m.options.filter((_, j) => j !== oi) }))
    setOptOf((o) => ({ ...o, [meal.id]: Math.max(0, oi - 1) }))
  }

  const save = (sure = false) => {
    const problem = problemOf(plan)
    if (problem) {
      setError(problem.text)
      return setMenuId(problem.menuId) // mostra o cardápio com o problema
    }
    if (replacing && !sure) return setConfirm('replace')
    const lastMenuId = plan.menus.some((m) => m.id === plan.lastMenuId) ? plan.lastMenuId : plan.menus[0].id
    const next: DietPlan = { ...tidyPlan(plan), lastMenuId }
    savePlan(() => next)
    setLog((l) => ensureDay(l, next, todayKey()))
    onDone()
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportDietFormat(tidyPlan(plan)))
      setNotice('Cardápio copiado. Cole na IA pra pedir ajustes.')
    } catch {
      setNotice('Não consegui copiar. Tente de novo.')
    }
  }
  const confirmed = () => {
    if (confirm === 'menu') return removeMenu()
    if (confirm === 'replace') return save(true)
    savePlan(() => DEFAULTS.dietPlan)
    onDone()
  }

  const dash = 'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium'

  return (
    <div className="flex flex-col gap-3 pb-6">
      <header className="flex items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Cancelar" onClick={onCancel}><ChevronLeft size={18} /></button>
        <h1 className="flex-1 text-[19px] font-semibold text-strong">Cardápio</h1>
        <Button size="sm" onClick={() => save()}>Salvar</Button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-negative/30 px-3 py-2 text-[13px] text-negative">{error}</p>}

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Cardápios">
        {plan.menus.map((m) => (
          <button key={m.id} type="button" className={cn('h-11 shrink-0 rounded-[10px] border px-3 text-[13px] whitespace-nowrap', m.id === menu.id ? 'border-accent bg-accent-bg text-accent' : 'border-border text-text')} aria-pressed={m.id === menu.id} onClick={() => setMenuId(m.id)}>
            {m.name.trim() || 'Sem nome'}
          </button>
        ))}
        <button type="button" className="flex h-11 shrink-0 items-center gap-1 rounded-[10px] border border-dashed border-border-strong px-3 text-[13px] text-text-2 disabled:opacity-40" disabled={plan.menus.length >= MAX_MENUS} onClick={() => addMenu(newMenu(plan.menus.length + 1))}><Plus size={16} /> Novo cardápio</button>
      </div>

      <section className="flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3">
        <div className="flex items-center gap-2">
          <Input className="min-w-0 flex-1 font-semibold" aria-label="Nome do cardápio" autoComplete="off" enterKeyHint="done" value={menu.name} onChange={(e) => patchMenu((m) => ({ ...m, name: e.target.value }))} />
          <button type="button" className="icon-btn disabled:opacity-40" aria-label="Duplicar cardápio" disabled={plan.menus.length >= MAX_MENUS} onClick={() => addMenu(copyMenu(menu))}><Copy size={16} /></button>
          <button type="button" className="icon-btn text-negative disabled:opacity-40" aria-label="Apagar cardápio" disabled={plan.menus.length < 2} onClick={() => setConfirm('menu')}><Trash2 size={16} /></button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="text-sm text-text-2">Meta diária (kcal)</span>
          <NumField key={`${menu.id}-kcal`} className="w-28 text-center" label="Meta diária em kcal" placeholder="opcional" value={menu.goalKcal} onChange={(n) => patchMenu((m) => ({ ...m, goalKcal: n === undefined ? undefined : Math.round(n) }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['p', 'c', 'f'] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1">
              <span className={LABEL}>{{ p: 'Proteína', c: 'Carbo', f: 'Gordura' }[k]} (g)</span>
              <NumField key={`${menu.id}-${k}`} className="text-center" label={`Meta de ${{ p: 'proteína', c: 'carbo', f: 'gordura' }[k]} em g`} placeholder="—" value={menu.goalMacros?.[k] || undefined} onChange={(n) => patchMenu((m) => setMacro(m, k, n))} />
            </label>
          ))}
        </div>
      </section>

      {menu.meals.map((meal, mi) => {
        const oi = Math.min(optOf[meal.id] ?? 0, meal.options.length - 1)
        const opt = meal.options[oi]
        const kcal = Math.round(opt.items.reduce((s, i) => s + itemKcal(i), 0))
        return (
          <section key={meal.id} className="flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3">
            <div className="flex items-center gap-2">
              <Input className="min-w-0 flex-1 font-semibold" aria-label={`Nome da refeição ${mi + 1}`} autoComplete="off" enterKeyHint="done" value={meal.name} onChange={(e) => patchMeal(meal.id, (m) => ({ ...m, name: e.target.value }))} />
              <Input type="time" className="w-28" aria-label={`Horário da refeição ${mi + 1}`} value={meal.time} onChange={(e) => patchMeal(meal.id, (m) => ({ ...m, time: e.target.value }))} />
              <button type="button" className="icon-btn" aria-label={`Remover refeição ${meal.name}`} onClick={() => patchMenu((m) => ({ ...m, meals: m.meals.filter((x) => x.id !== meal.id) }))}><Trash2 size={16} /></button>
            </div>
            <div className="flex items-center gap-1.5">
              {meal.options.map((o, j) => (
                <button key={o.id} type="button" className={cn('h-11 rounded-[10px] border px-2.5 text-[12.5px] font-semibold', j === oi ? 'border-accent bg-accent-bg text-accent' : 'border-border text-text-2')} aria-pressed={j === oi} onClick={() => setOptOf((s) => ({ ...s, [meal.id]: j }))}>
                  Opção {optionLetter(j)}
                </button>
              ))}
              {meal.options.length < MAX_OPTIONS && <button type="button" className="flex size-11 items-center justify-center text-accent" aria-label={`Adicionar opção na refeição ${mi + 1}`} onClick={() => addOption(meal)}><Plus size={18} /></button>}
              <span className="ml-auto text-[12.5px] tabular-nums text-text-2">{kcal} kcal</span>
            </div>
            <div className="flex items-center gap-2">
              <Input className="min-w-0 flex-1" aria-label={`Nome da opção da refeição ${mi + 1}`} placeholder={`Nome da opção ${optionLetter(oi)} (opcional)`} autoComplete="off" value={opt.name ?? ''} onChange={(e) => patchOption(meal.id, oi, (o) => ({ ...o, name: e.target.value || undefined }))} />
              {meal.options.length > 1 && <button type="button" className="icon-btn" aria-label={`Remover opção ${optionLetter(oi)} da refeição ${mi + 1}`} onClick={() => removeOption(meal, oi)}><Trash2 size={16} /></button>}
            </div>
            <ul>
              {opt.items.map((it, i) => (
                <li key={it.id} className="flex flex-col gap-1.5 border-t border-line py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[14px] text-strong">{it.name}</span>
                    <span className="text-[12.5px] tabular-nums text-text-2">{Math.round(itemKcal(it))} kcal</span>
                  </div>
                  {iaLabel(it) && <span className="text-[12px] text-c7">{iaLabel(it)}</span>}
                  <div className="flex items-center gap-1.5">
                    <Input className="min-w-0 flex-1" aria-label={`Porção de ${it.name}`} placeholder="Porção" autoComplete="off" value={it.portion ?? ''} onChange={(e) => patchItems(meal.id, oi, (xs) => xs.map((x) => (x.id === it.id ? { ...x, portion: e.target.value || undefined } : x)))} />
                    <NumField className="w-16 text-center" label={`Gramas de ${it.name}`} value={it.grams} onChange={(n) => n && patchItems(meal.id, oi, (xs) => xs.map((x) => (x.id === it.id ? { ...x, grams: Math.min(GRAMS[1], Math.max(GRAMS[0], n)) } : x)))} />
                    <span className="text-[12.5px] text-text-2">g</span>
                    <button type="button" className="icon-btn disabled:opacity-40" aria-label={`Subir ${it.name}`} disabled={i === 0} onClick={() => patchItems(meal.id, oi, (xs) => { const a = [...xs]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })}><ArrowUp size={14} /></button>
                    <button type="button" className="icon-btn disabled:opacity-40" aria-label={`Descer ${it.name}`} disabled={i === opt.items.length - 1} onClick={() => patchItems(meal.id, oi, (xs) => { const a = [...xs]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a })}><ArrowDown size={14} /></button>
                    <button type="button" className="icon-btn" aria-label={`Remover ${it.name}`} onClick={() => patchItems(meal.id, oi, (xs) => xs.filter((x) => x.id !== it.id))}><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className={cn(dash, 'justify-start text-accent disabled:opacity-40')} disabled={opt.items.length >= MAX_ITEMS} onClick={() => setPicking({ mealId: meal.id, oi, name: meal.name })}><Plus size={18} /> Alimento</button>
          </section>
        )
      })}
      <button type="button" className={cn(dash, 'border border-dashed border-border-strong text-text-2 disabled:opacity-40')} disabled={menu.meals.length >= MAX_MEALS} onClick={addMeal}><Plus size={18} /> Refeição</button>

      <Button variant="outline" onClick={copy}><Share2 /> Exportar cardápio</Button>
      {notice && <p className="text-center text-[13px] text-text-2" role="status">{notice}</p>}
      <Button variant="ghost" className="text-negative hover:text-negative" onClick={() => setConfirm('all')}>Apagar todos os cardápios</Button>

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
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm && CONFIRM[confirm].title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm && CONFIRM[confirm].text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant={confirm === 'replace' ? 'default' : 'destructive'} onClick={confirmed}>{confirm === 'replace' ? 'Substituir' : 'Apagar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
