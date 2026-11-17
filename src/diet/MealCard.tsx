import { useState, type ReactNode } from 'react'
import { ArrowLeftRight, Check, ChevronRight, Plus, Sparkles } from 'lucide-react'
import type { DayItem, DayMeal, DietDay, DietItem, DietPlan } from '../types'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { FoodPicker } from './FoodPicker'
import { addExtra, iaLabel, itemKcal, removeItem, setMealFree, skipItem, swapItem, swapMeal, toggleMeal, undoSwap } from './day'

export type Act = (f: (d: DietDay) => DietDay) => void
type Props = { meal: DayMeal; plan: DietPlan; menuId: string; dayFree: boolean; open: boolean; onOpen: () => void; act: Act }

const LABEL = 'pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[.04em] text-faint'
const count = (n: number, one: string, many: string) => n > 0 && `${n} ${n === 1 ? one : many}`
const kcalOf = (items: DietItem[]) => Math.round(items.reduce((s, i) => s + itemKcal(i), 0))

export function MealCard({ meal, plan, menuId, dayFree, open, onOpen, act }: Props) {
  const [picking, setPicking] = useState<DayItem | 'extra'>()
  const [swapping, setSwapping] = useState(false)
  const free = dayFree || !!meal.free
  const isFree = (d: DietDay) => !!d.meals.find((m) => m.id === meal.id)?.free // decide no salvo, não no render

  const sub = [
    meal.time,
    meal.free ? 'livre' : `${formatDec(kcalOf(meal.items.filter((i) => !i.skipped)))} kcal`,
    meal.swappedMeal,
    count(meal.items.filter((i) => i.swappedFrom).length, 'troca', 'trocas'),
    count(meal.items.filter((i) => i.extra).length, 'extra', 'extras'),
  ].filter(Boolean).join(' · ')

  const options = plan.menus.find((m) => m.id === menuId)?.meals.find((m) => m.id === meal.id)?.options ?? []
  const optName = (name: string | undefined, i: number) => name || `Opção ${'ABCD'[i]}`
  const current = meal.swappedMeal ?? optName(options[0]?.name, 0)
  const groups = [
    { id: 'options', label: 'Opções desta refeição', rows: options.map((o, i) => ({ id: o.id, title: optName(o.name, i), name: optName(o.name, i), items: o.items })).filter((r) => r.name !== current) },
    ...plan.menus.filter((m) => m.id !== menuId).map((m) => ({
      id: m.id,
      label: m.name,
      rows: m.meals.map((ml) => ({ id: ml.id, title: ml.name, name: `${m.name} · ${ml.name}`, items: ml.options[0]?.items ?? [] })).filter((r) => r.name !== current),
    })),
  ].filter((g) => g.rows.length)

  const itemRow = (i: DayItem) => {
    const body: ReactNode = (
      <>
        {i.swappedFrom && <ArrowLeftRight size={12} className="shrink-0 text-accent" aria-hidden="true" />}
        {i.extra && <Plus size={12} className="shrink-0 text-accent" aria-hidden="true" />}
        <span className="min-w-0 flex-1 py-1.5">
          <span className={cn('block truncate text-sm', i.skipped ? 'text-faint line-through' : i.swappedFrom ? 'text-accent' : 'text-text')}>{i.name}</span>
          <span className="block truncate text-[12.5px] text-faint">{i.portion ?? `${formatDec(i.grams)} g`}</span>
          {iaLabel(i) && <span className="block text-[12px] text-c7">{iaLabel(i)}</span>}
        </span>
        <span className="w-10 shrink-0 text-right text-[12.5px] tabular-nums text-text-2">{Math.round(itemKcal(i))}</span>
      </>
    )
    const undo = (label: string, aria: string, f: (d: DietDay) => DietDay) => (
      <Button variant="ghost" size="sm" className="h-11 shrink-0 text-accent" aria-label={aria} onClick={() => act(f)}>{label}</Button>
    )
    return (
      <li key={i.id} className="flex items-center gap-1 border-t border-line pr-1 pl-14">
        {free || i.skipped || i.extra ? (
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2">{body}</div>
        ) : (
          <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setPicking(i)}>{body}</button>
        )}
        {i.skipped && undo('Desfazer', `Desfazer pular ${i.name}`, (d) => skipItem(d, meal.id, i.id, false))}
        {i.extra && undo('Remover', `Remover ${i.name}`, (d) => removeItem(d, meal.id, i.id))}
        {i.original && !i.skipped && undo('Desfazer', `Desfazer troca de ${i.name}`, (d) => undoSwap(d, meal.id, i.id))}
      </li>
    )
  }

  const action = (icon: ReactNode, label: string, onClick: () => void) => (
    <Button variant="ghost" size="sm" className="h-11 text-accent" onClick={onClick}>{icon}{label}</Button>
  )

  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex items-center gap-1 pr-2 pl-1.5">
        <button
          type="button" aria-pressed={meal.done} aria-label={`Marcar ${meal.name}`} className="flex size-11 shrink-0 items-center justify-center"
          onClick={() => act((d) => (isFree(d) ? setMealFree(d, meal.id, false) : toggleMeal(d, meal.id)))}
        >
          <span className={cn('flex size-7 items-center justify-center rounded-full border', meal.done ? 'border-accent bg-accent text-on-accent' : 'border-border text-transparent')}>
            {meal.free ? <Sparkles size={14} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          </span>
        </button>
        <button type="button" aria-expanded={open} onClick={onOpen} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 py-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-strong">{meal.name}</span>
            <span className="block text-[13px] text-text-2">{sub}</span>
          </span>
          <ChevronRight size={16} className={cn('shrink-0 text-faint transition-transform', open && 'rotate-90')} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <>
          <ul>{meal.items.map(itemRow)}</ul>
          <div className="flex flex-wrap gap-x-1 border-t border-line px-2 py-1">
            {!free && action(<Plus aria-hidden="true" />, 'Adicionar extra', () => setPicking('extra'))}
            {!free && action(<ArrowLeftRight aria-hidden="true" />, 'Trocar refeição', () => setSwapping(true))}
            {!dayFree && action(<Sparkles aria-hidden="true" />, meal.free ? 'Desfazer refeição livre' : 'Refeição livre', () => act((d) => setMealFree(d, meal.id, !isFree(d))))}
          </div>
        </>
      )}

      {picking === 'extra' && (
        <FoodPicker title={`Extra · ${meal.name}`} confirmLabel="Adicionar" onClose={() => setPicking(undefined)} onPick={(it) => { act((d) => addExtra(d, meal.id, it)); setPicking(undefined) }} />
      )}
      {picking && picking !== 'extra' && (
        <FoodPicker
          title={`Trocar · ${picking.name}`} confirmLabel="Trocar" initialGrams={picking.grams} onClose={() => setPicking(undefined)}
          onPick={(it) => { act((d) => swapItem(d, meal.id, picking.id, it)); setPicking(undefined) }}
          extraAction={{ label: 'Pular hoje', onClick: () => { act((d) => skipItem(d, meal.id, picking.id, true)); setPicking(undefined) } }}
        />
      )}
      {swapping && (
        <Drawer open onOpenChange={(o) => !o && setSwapping(false)}>
          <DrawerContent>
            <div className="flex min-h-0 flex-col overflow-y-auto px-4 pt-2 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <DrawerTitle className="shrink-0 truncate pb-1 text-[19px] font-semibold text-strong">{`Trocar refeição · ${meal.name}`}</DrawerTitle>
              <DrawerDescription className="text-[13px] text-text-2">Só hoje. O cardápio não muda.</DrawerDescription>
              {!groups.length && <p className="pt-3 text-[13px] text-text-2">Sem outras opções. Crie opções no editor do cardápio.</p>}
              {groups.map((g) => (
                <div key={g.id}>
                  <h3 className={LABEL}>{g.label}</h3>
                  <ul aria-label={g.label} className="overflow-hidden rounded-[14px] border border-border bg-surface">
                    {g.rows.map((r) => (
                      <li key={r.id} className="border-t border-line first:border-t-0">
                        <button type="button" className="flex min-h-14 w-full flex-col justify-center px-3 py-2 text-left" onClick={() => { act((d) => swapMeal(d, meal.id, { name: r.name, items: r.items })); setSwapping(false) }}>
                          <span className="text-[15px] font-semibold text-strong">{r.title}</span>
                          <span className="truncate text-[12.5px] text-text-2">{`${formatDec(kcalOf(r.items))} kcal · ${r.items.map((i) => i.name).join(' + ')}`}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </li>
  )
}
