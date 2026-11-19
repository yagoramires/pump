import { useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, Share2, Trash2 } from 'lucide-react'
import { DEFAULTS } from '@/schema'
import type { DietItem, DietPlan, Macros, Meal, MealOption, Menu } from './types'
import { currentMenu, optionLetter, sortedMeals } from './day'
import { iaLabel, itemKcal, kcalOf } from './food'
import { emptyMenu } from './plan'
import { exportDietFormat } from './dietFormat'
import { GOAL_KCAL, GRAMS, HHMM, MACRO_G, MAX_ITEMS, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'
import { FoodPicker } from './FoodPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { BackHeader } from '@/components/BackHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NumberField } from '@/components/NumberField'
import { TimePicker } from '@/components/TimePicker'
import { copyText } from '@/lib/share'

/** "Apagar todos" também chega pelo `onSave`, com o plano vazio */
type Props = { initial: DietPlan; onSave: (plan: DietPlan) => void; onCancel: () => void }

const CONFIRM = {
  menu: { title: 'Apagar este cardápio?', text: 'As refeições dele saem do editor. O histórico fica.' },
  all: { title: 'Apagar todos os cardápios?', text: 'A aba Dieta volta ao convite. O histórico fica.' },
}

const fresh = <T extends { id: string }>(x: T): T => ({ ...x, id: crypto.randomUUID() })
const newMenu = (n: number): Menu => ({ id: crypto.randomUUID(), name: `Cardápio ${n}`, meals: [] })
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

export function DietEditor({ initial, onSave, onCancel }: Props) {
  const [plan, setPlan] = useState<DietPlan>(() => (initial.menus.length ? structuredClone(initial) : { menus: [emptyMenu(1)] }))
  const [menuId, setMenuId] = useState(() => (currentMenu(plan) ?? plan.menus[0]).id)
  const [optOf, setOptOf] = useState<Record<string, number>>({})
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
    patchMenu((m) => ({ ...m, meals: [...m.meals, { id: crypto.randomUUID(), name: `Refeição ${m.meals.length + 1}`, time: '', options: [{ id: crypto.randomUUID(), items: [] }] }] }))
  const addOption = (meal: Meal) => {
    patchMeal(meal.id, (m) => ({ ...m, options: [...m.options, { id: crypto.randomUUID(), items: [] }] }))
    setOptOf((o) => ({ ...o, [meal.id]: meal.options.length }))
  }
  const removeOption = (meal: Meal, oi: number) => {
    patchMeal(meal.id, (m) => ({ ...m, options: m.options.filter((_, j) => j !== oi) }))
    setOptOf((o) => ({ ...o, [meal.id]: Math.max(0, oi - 1) }))
  }

  const save = () => {
    const problem = problemOf(plan)
    if (problem) {
      setError(problem.text)
      return setMenuId(problem.menuId)
    }
    onSave(tidyPlan(plan))
  }
  const copy = async () => setNotice((await copyText(exportDietFormat(tidyPlan(plan)))) ? 'Cardápio copiado. Cole na IA pra pedir ajustes.' : 'Não consegui copiar. Tente de novo.')
  const confirmed = () => (confirm === 'menu' ? removeMenu() : onSave(DEFAULTS.dietPlan))

  return (
    <div className="flex flex-col gap-3 pb-6">
      <BackHeader title="Cardápio" onBack={onCancel} label="Cancelar">
        <Button size="sm" onClick={save}>Salvar</Button>
      </BackHeader>
      {error && <Card role="alert" className="border-negative/30 px-3 py-2 text-[13px] text-negative">{error}</Card>}

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Cardápios">
        {plan.menus.map((m) => (
          <Toggle key={m.id} variant="outline" className="h-11 shrink-0 rounded-xl px-3 text-[13px]" pressed={m.id === menu.id} onPressedChange={() => setMenuId(m.id)}>
            {m.name.trim() || 'Sem nome'}
          </Toggle>
        ))}
        <Button variant="outline" size="sm" className="border-dashed border-border-strong text-text-2" disabled={plan.menus.length >= MAX_MENUS} onClick={() => addMenu(newMenu(plan.menus.length + 1))}><Plus aria-hidden="true" /> Novo cardápio</Button>
      </div>

      <Card className="gap-2.5 p-3">
        <div className="flex items-center gap-2">
          <Input className="min-w-0 flex-1 font-semibold" aria-label="Nome do cardápio" autoComplete="off" enterKeyHint="done" value={menu.name} onChange={(e) => patchMenu((m) => ({ ...m, name: e.target.value }))} />
          <Button variant="outline" size="icon" aria-label="Duplicar cardápio" disabled={plan.menus.length >= MAX_MENUS} onClick={() => addMenu(copyMenu(menu))}><Copy aria-hidden="true" /></Button>
          <Button variant="outline" size="icon" className="text-negative hover:text-negative" aria-label="Apagar cardápio" disabled={plan.menus.length < 2} onClick={() => setConfirm('menu')}><Trash2 aria-hidden="true" /></Button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="text-sm text-text-2">Meta diária (kcal)</span>
          <NumberField className="w-28 text-center" aria-label="Meta diária em kcal" placeholder="opcional" autoComplete="off" enterKeyHint="done" min={0} max={Infinity} value={menu.goalKcal} onChange={(n) => n !== null && patchMenu((m) => ({ ...m, goalKcal: n === undefined ? undefined : Math.round(n) }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['p', 'c', 'f'] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="label-caps tracking-[.04em]">{{ p: 'Proteína', c: 'Carbo', f: 'Gordura' }[k]} (g)</span>
              <NumberField className="text-center" aria-label={`Meta de ${{ p: 'proteína', c: 'carbo', f: 'gordura' }[k]} em g`} placeholder="—" autoComplete="off" enterKeyHint="done" min={0} max={Infinity} value={menu.goalMacros?.[k] || undefined} onChange={(n) => n !== null && patchMenu((m) => setMacro(m, k, n))} />
            </label>
          ))}
        </div>
      </Card>

      {menu.meals.map((meal, mi) => {
        const oi = Math.min(optOf[meal.id] ?? 0, meal.options.length - 1)
        const opt = meal.options[oi]
        const kcal = kcalOf(opt.items)
        return (
          <Card key={meal.id} className="gap-2.5 p-3">
            <div className="flex items-center gap-2">
              <Input className="min-w-0 flex-1 font-semibold" aria-label={`Nome da refeição ${mi + 1}`} autoComplete="off" enterKeyHint="done" value={meal.name} onChange={(e) => patchMeal(meal.id, (m) => ({ ...m, name: e.target.value }))} />
              <TimePicker className="w-28" aria-label={`Horário da refeição ${mi + 1}`} value={meal.time} onChange={(v) => patchMeal(meal.id, (m) => ({ ...m, time: v ?? '' }))} />
              <Button variant="outline" size="icon" aria-label={`Remover refeição ${meal.name}`} onClick={() => patchMenu((m) => ({ ...m, meals: m.meals.filter((x) => x.id !== meal.id) }))}><Trash2 aria-hidden="true" /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {meal.options.map((o, j) => (
                <Toggle key={o.id} variant="outline" className="h-11 rounded-xl px-2.5 text-[12.5px] font-semibold" pressed={j === oi} onPressedChange={() => setOptOf((s) => ({ ...s, [meal.id]: j }))}>
                  Opção {optionLetter(j)}
                </Toggle>
              ))}
              {meal.options.length < MAX_OPTIONS && <Button variant="ghost" size="icon" className="text-accent" aria-label={`Adicionar opção na refeição ${mi + 1}`} onClick={() => addOption(meal)}><Plus aria-hidden="true" /></Button>}
              <span className="ml-auto text-[12.5px] tabular-nums text-text-2">{kcal} kcal</span>
            </div>
            <div className="flex items-center gap-2">
              <Input className="min-w-0 flex-1" aria-label={`Nome da opção da refeição ${mi + 1}`} placeholder={`Nome da opção ${optionLetter(oi)} (opcional)`} autoComplete="off" value={opt.name ?? ''} onChange={(e) => patchOption(meal.id, oi, (o) => ({ ...o, name: e.target.value || undefined }))} />
              {meal.options.length > 1 && <Button variant="outline" size="icon" aria-label={`Remover opção ${optionLetter(oi)} da refeição ${mi + 1}`} onClick={() => removeOption(meal, oi)}><Trash2 aria-hidden="true" /></Button>}
            </div>
            <ul>
              {opt.items.map((it, i) => (
                <li key={it.id} className="flex flex-col gap-1.5 border-t border-line py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[14px] text-strong">{it.name}</span>
                    <span className="text-[12.5px] tabular-nums text-text-2">{Math.round(itemKcal(it))} kcal</span>
                  </div>
                  {iaLabel(it) && <span className="text-[12px] text-c7">{iaLabel(it)}</span>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Input className="min-w-24 flex-1" aria-label={`Porção de ${it.name}`} placeholder="Porção" autoComplete="off" value={it.portion ?? ''} onChange={(e) => patchItems(meal.id, oi, (xs) => xs.map((x) => (x.id === it.id ? { ...x, portion: e.target.value || undefined } : x)))} />
                    <NumberField className="w-16 text-center" aria-label={`Gramas de ${it.name}`} autoComplete="off" enterKeyHint="done" min={GRAMS[0]} max={GRAMS[1]} value={it.grams} onChange={(n) => n != null && patchItems(meal.id, oi, (xs) => xs.map((x) => (x.id === it.id ? { ...x, grams: n } : x)))} />
                    <span className="text-[12.5px] text-text-2">g</span>
                    <Button variant="outline" size="icon" aria-label={`Subir ${it.name}`} disabled={i === 0} onClick={() => patchItems(meal.id, oi, (xs) => { const a = [...xs]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })}><ArrowUp aria-hidden="true" /></Button>
                    <Button variant="outline" size="icon" aria-label={`Descer ${it.name}`} disabled={i === opt.items.length - 1} onClick={() => patchItems(meal.id, oi, (xs) => { const a = [...xs]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a })}><ArrowDown aria-hidden="true" /></Button>
                    <Button variant="outline" size="icon" aria-label={`Remover ${it.name}`} onClick={() => patchItems(meal.id, oi, (xs) => xs.filter((x) => x.id !== it.id))}><Trash2 aria-hidden="true" /></Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="w-full justify-start text-accent" disabled={opt.items.length >= MAX_ITEMS} onClick={() => setPicking({ mealId: meal.id, oi, name: meal.name })}><Plus aria-hidden="true" /> Alimento</Button>
          </Card>
        )
      })}
      <Button variant="outline" className="w-full border-dashed border-border-strong text-text-2" disabled={menu.meals.length >= MAX_MEALS} onClick={addMeal}><Plus aria-hidden="true" /> Refeição</Button>

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
      <ConfirmDialog
        open={!!confirm} title={confirm ? CONFIRM[confirm].title : ''} text={confirm ? CONFIRM[confirm].text : ''} confirm="Apagar" destructive
        onConfirm={confirmed} onCancel={() => setConfirm(undefined)}
      />
    </div>
  )
}
