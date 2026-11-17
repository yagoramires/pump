import { useState, type ReactNode } from 'react'
import { ArrowLeftRight, Check, ChevronLeft, MoreHorizontal, Plus, Sparkles } from 'lucide-react'
import type { DayItem, DayMeal, DietDay, DietItem, DietPlan, Menu } from '../types'
import { Overlay } from '@/components/Overlay'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { FoodPicker } from './FoodPicker'
import { type Act, addExtra, chooseOption, iaLabel, itemKcal, itemMacros, removeItem, setMealFree, skipItem, swapItem, swapMeal, toggleMeal, undoSwap } from './day'

type Props = { meal: DayMeal; menu?: Menu; plan: DietPlan; dayFree: boolean; act: Act; onClose: () => void }

const LABEL = 'pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[.04em] text-faint'
const CARD = 'overflow-hidden rounded-[14px] border border-border bg-surface'
const kcalOf = (items: DietItem[]) => Math.round(items.reduce((s, i) => s + itemKcal(i), 0))

export function MealScreen({ meal, menu, plan, dayFree, act, onClose }: Props) {
  const [picking, setPicking] = useState<DayItem | 'extra'>()
  const [sheet, setSheet] = useState<'more' | 'swap'>()
  const free = dayFree || !!meal.free
  const isFree = (d: DietDay) => !!d.meals.find((m) => m.id === meal.id)?.free // decide no salvo, não no render

  const options = menu?.meals.find((m) => m.id === meal.id)?.options ?? []
  const selIdx = Math.max(0, options.findIndex((o) => o.id === meal.optionId))
  const selected = options[selIdx]
  const letter = (i: number) => 'ABCD'[i] ?? String(i + 1)

  const counted = meal.items.filter((i) => !i.skipped)
  const t = counted.reduce((s, i) => { const x = itemMacros(i); return { p: s.p + x.p, c: s.c + x.c, f: s.f + x.f } }, { p: 0, c: 0, f: 0 })
  const total = `${formatDec(kcalOf(counted))} kcal · P ${Math.round(t.p)} · C ${Math.round(t.c)} · G ${Math.round(t.f)}`

  const groups = plan.menus.filter((m) => m.id !== menu?.id).map((m) => ({
    id: m.id,
    label: m.name,
    rows: m.meals.map((ml) => ({ id: ml.id, title: ml.name, name: `${m.name} · ${ml.name}`, items: ml.options[0]?.items ?? [] })).filter((r) => r.name !== meal.swappedMeal),
  })).filter((g) => g.rows.length)

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
      <li key={i.id} className="flex items-center gap-1 border-t border-line px-3 first:border-t-0">
        {free || i.skipped || i.extra ? (
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2">{body}</div>
        ) : (
          <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setPicking(i)}>{body}</button>
        )}
        {!free && i.skipped && undo('Desfazer', `Desfazer pular ${i.name}`, (d) => skipItem(d, meal.id, i.id, false))}
        {!free && i.extra && undo('Remover', `Remover ${i.name}`, (d) => removeItem(d, meal.id, i.id))}
        {!free && i.original && !i.skipped && undo('Desfazer', `Desfazer troca de ${i.name}`, (d) => undoSwap(d, meal.id, i.id))}
      </li>
    )
  }

  const row = (icon: ReactNode, label: string, onClick: () => void) => (
    <li className="border-t border-line first:border-t-0">
      <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 text-left text-[15px] text-strong" onClick={onClick}>{icon}{label}</button>
    </li>
  )

  return (
    <Overlay>
      <header className="flex items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={onClose}><ChevronLeft size={18} /></button>
        <h1 className="min-w-0 flex-1 truncate text-[19px] font-semibold text-strong">{`${meal.name} · ${meal.time}`}</h1>
        {!dayFree && <button type="button" className="icon-btn" aria-label="Mais opções da refeição" onClick={() => setSheet('more')}><MoreHorizontal size={18} /></button>}
      </header>

      <div className="pb-24">
        {options.length > 1 && !meal.swappedMeal && (
          <ToggleGroup
            type="single" spacing={1} aria-label="Opção" disabled={free} value={selected.id}
            onValueChange={(v) => { const o = options.find((x) => x.id === v); if (o) act((d) => chooseOption(d, meal.id, o)) }}
            className="mt-2 grid w-full auto-cols-fr grid-flow-col gap-[3px] rounded-xl border border-border bg-panel p-[3px]"
          >
            {options.map((o, i) => (
              <ToggleGroupItem key={o.id} value={o.id} className="h-11 rounded-[9px] text-[13px] font-semibold text-faint data-[state=on]:bg-[#2a2c33] data-[state=on]:text-strong">{letter(i)}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {meal.swappedMeal ? (
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 text-[13px] text-text-2">{`De outro cardápio: ${meal.swappedMeal}`}</p>
            {options[0] && !free && <Button variant="ghost" size="sm" className="h-11 shrink-0 text-accent" onClick={() => act((d) => chooseOption(d, meal.id, options[0]))}>Voltar às opções</Button>}
          </div>
        ) : (
          options.length > 1 && <p className="mx-0.5 mt-1.5 text-[13px] text-text-2">{[`Opção ${letter(selIdx)}`, selected.name].filter(Boolean).join(' · ')}</p>
        )}

        <ul className={cn(CARD, 'mt-3', free && 'opacity-60')}>{meal.items.map(itemRow)}</ul>
        {!free && (
          <Button variant="ghost" size="sm" className="mt-1 h-11 text-accent" onClick={() => setPicking('extra')}><Plus aria-hidden="true" />Adicionar extra</Button>
        )}
        <p className="flex justify-between gap-2 px-0.5 pt-2 text-[13px] text-text-2">
          <span>Total</span>
          <b className="font-semibold text-strong tabular-nums">{total}</b>
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md gap-2 bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {meal.done ? (
          <>
            <Button variant="outline" className="h-11 flex-1 bg-transparent" onClick={() => act((d) => (isFree(d) ? setMealFree(d, meal.id, false) : toggleMeal(d, meal.id)))}>Desmarcar</Button>
            <Button className="h-11 flex-[1.4]" onClick={onClose}>Voltar</Button>
          </>
        ) : (
          <>
            {!dayFree && <Button variant="outline" className="h-11 flex-1 bg-transparent" onClick={() => { act((d) => setMealFree(d, meal.id, true)); onClose() }}>Refeição livre</Button>}
            <Button className="h-11 flex-[1.4]" onClick={() => { act((d) => toggleMeal(d, meal.id)); onClose() }}><Check aria-hidden="true" />Comi esta</Button>
          </>
        )}
      </div>

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
      {sheet && (
        <Drawer open onOpenChange={(o) => !o && setSheet(undefined)}>
          <DrawerContent>
            <div className="flex min-h-0 flex-col overflow-y-auto px-4 pt-2 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sheet === 'more' ? (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-2 text-[19px] font-semibold text-strong">{meal.name}</DrawerTitle>
                  <DrawerDescription className="sr-only">Mais opções da refeição</DrawerDescription>
                  <ul className={CARD}>
                    {!free && row(<ArrowLeftRight size={18} className="text-accent" aria-hidden="true" />, 'Trocar por refeição de outro cardápio', () => setSheet('swap'))}
                    {row(<Sparkles size={18} className="text-accent" aria-hidden="true" />, meal.free ? 'Desfazer refeição livre' : 'Refeição livre', () => {
                      setSheet(undefined)
                      if (meal.free) act((d) => setMealFree(d, meal.id, false))
                      else { act((d) => setMealFree(d, meal.id, true)); onClose() }
                    })}
                  </ul>
                </>
              ) : (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-1 text-[19px] font-semibold text-strong">{`Trocar refeição · ${meal.name}`}</DrawerTitle>
                  <DrawerDescription className="text-[13px] text-text-2">Só hoje. O cardápio não muda.</DrawerDescription>
                  {!groups.length && <p className="pt-3 text-[13px] text-text-2">Sem refeições em outros cardápios.</p>}
                  {groups.map((g) => (
                    <div key={g.id}>
                      <h3 className={LABEL}>{g.label}</h3>
                      <ul aria-label={g.label} className={CARD}>
                        {g.rows.map((r) => (
                          <li key={r.id} className="border-t border-line first:border-t-0">
                            <button type="button" className="flex min-h-14 w-full flex-col justify-center px-3 py-2 text-left" onClick={() => { act((d) => swapMeal(d, meal.id, { name: r.name, items: r.items })); setSheet(undefined) }}>
                              <span className="text-[15px] font-semibold text-strong">{r.title}</span>
                              <span className="truncate text-[12.5px] text-text-2">{`${formatDec(kcalOf(r.items))} kcal · ${r.items.map((i) => i.name).join(' + ')}`}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </Overlay>
  )
}
