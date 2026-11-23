import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Check, MoreHorizontal, Plus, Sparkles } from 'lucide-react'
import type { DayItem, DietDay } from './types'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { SheetBody, SheetRow } from '@/components/SheetRow'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { FoodPicker } from './FoodPicker'
import { addExtra, chooseOption, mealItems, mealOptions, removeItem, setMealFree, skipItem, swapItem, swapMeal, toggleMeal, undoSwap } from './day'
import { itemKcal, kcalOf, macrosOf } from './food'
import { iaLabel, macroText, optionLabel, optionLetter, portionText } from './display'
import { useDietToday } from './useDietToday'

export function MealScreen({ mealId, onClose }: { mealId: string; onClose: () => void }) {
  const { tick, plan, day, menu, act } = useDietToday()
  const [picking, setPicking] = useState<DayItem | 'extra'>()
  const [sheet, setSheet] = useState<'more' | 'swap'>()
  const meal = day?.meals.find((m) => m.id === mealId)
  // a refeição some do dia quando o cardápio muda por fora: fecha, pra não reabrir se ela voltar
  const gone = !meal
  useEffect(() => { if (gone) onClose() }, [gone, onClose])
  if (!day || !meal) return null
  // o relógio pode ter andado (ex.: meia-noite) com a tela aberta
  const back = () => { tick(); onClose() }
  const dayFree = !!day.free
  const free = dayFree || !!meal.free

  const { options, index: selIdx, canToggle } = mealOptions(plan, day, meal.id)
  const selected = options[selIdx]

  const counted = mealItems(meal)
  const t = macrosOf(counted)
  const total = `${formatDec(kcalOf(counted))} kcal · ${macroText({ p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) })}`

  const groups = plan.menus.filter((m) => m.id !== menu?.id).map((m) => ({
    id: m.id,
    label: m.name,
    rows: m.meals.map((ml) => ({ id: ml.id, title: ml.name, name: `${m.name} · ${ml.name}`, items: ml.options[0]?.items ?? [] })).filter((r) => r.name !== meal.swappedMeal),
  })).filter((g) => g.rows.length)

  const itemRow = (i: DayItem) => {
    const ia = iaLabel(i)
    const body: ReactNode = (
      <>
        {i.swappedFrom && <ArrowLeftRight size={12} className="shrink-0 text-accent" aria-hidden="true" />}
        {i.extra && <Plus size={12} className="shrink-0 text-accent" aria-hidden="true" />}
        <span className="min-w-0 flex-1 py-1.5">
          <span className={cn('block truncate text-sm', i.skipped ? 'text-faint line-through' : i.swappedFrom ? 'text-accent' : 'text-text')}>{i.name}</span>
          <span className="block truncate text-caption text-faint">{portionText(i)}</span>
          {ia && <span className="block text-caption text-warning">{ia}</span>}
        </span>
        <span className="w-10 shrink-0 text-right text-caption tabular-nums text-text-2">{Math.round(itemKcal(i))}</span>
      </>
    )
    const undo = (label: string, aria: string, f: (d: DietDay) => DietDay) => (
      <Button variant="link" size="sm" className="text-accent" aria-label={aria} onClick={() => act(f)}>{label}</Button>
    )
    return (
      <li key={i.id} className="flex items-center gap-2 border-t border-line px-3.5 first:border-t-0">
        {free || i.skipped || i.extra ? (
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2">{body}</div>
        ) : (
          <Button variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 justify-start gap-2 rounded-none px-0 py-0 text-left font-normal hover:bg-transparent" onClick={() => setPicking(i)}>{body}</Button>
        )}
        {!free && i.skipped && undo('Desfazer', `Desfazer pular ${i.name}`, (d) => skipItem(d, meal.id, i.id, false))}
        {!free && i.extra && undo('Remover', `Remover ${i.name}`, (d) => removeItem(d, meal.id, i.id))}
        {!free && i.original && !i.skipped && undo('Desfazer', `Desfazer troca de ${i.name}`, (d) => undoSwap(d, meal.id, i.id))}
      </li>
    )
  }

  return (
    <Overlay>
      <BackHeader title={`${meal.name} · ${meal.time}`} onBack={back} titleClassName="min-w-0 truncate">
        {!dayFree && <Button variant="outline" size="icon" aria-label="Mais opções da refeição" onClick={() => setSheet('more')}><MoreHorizontal aria-hidden="true" /></Button>}
      </BackHeader>

      <div className="flex flex-col gap-2.5 pb-24">
        {canToggle && (
          <ToggleGroup
            type="single" variant="segmented" size="fill" spacing={1} aria-label="Opção" disabled={free} value={selected.id}
            onValueChange={(v) => { const o = options.find((x) => x.id === v); if (o && o.id !== selected.id) act((d) => chooseOption(d, meal.id, o)) }}
            className="grid w-full auto-cols-fr grid-flow-col"
          >
            {options.map((o, i) => (
              <ToggleGroupItem key={o.id} value={o.id} className="h-11">{optionLetter(i)}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {meal.swappedMeal ? (
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-meta text-text-2">{`De outro cardápio: ${meal.swappedMeal}`}</p>
            {options[0] && !free && <Button variant="link" size="sm" className="text-accent" onClick={() => act((d) => chooseOption(d, meal.id, options[0]))}>Voltar às opções</Button>}
          </div>
        ) : (
          options.length > 1 && <p className="text-meta text-text-2">{optionLabel(selIdx, selected.name)}</p>
        )}

        <Card size="flush" className={cn(free && 'opacity-60')}>
        <ul>
          {meal.items.map(itemRow)}
          {!free && (
            <li className="border-t border-line first:border-t-0">
              <Button variant="ghost" className="w-full justify-start rounded-none px-3.5 text-accent" onClick={() => setPicking('extra')}><Plus aria-hidden="true" />Adicionar extra</Button>
            </li>
          )}
        </ul>
        </Card>
        <p className="flex justify-between gap-2 px-0.5 text-meta text-text-2">
          <span>Total</span>
          <b className="font-semibold text-strong tabular-nums">{total}</b>
        </p>
      </div>

      <BottomBar className="z-(--z-bar) gap-2">
        {meal.done ? (
          <>
            <Button variant="outline" className="flex-1" onClick={() => act((d) => toggleMeal(d, meal.id))}>Desmarcar</Button>
            <Button className="flex-[1.4]" onClick={back}>Voltar</Button>
          </>
        ) : (
          <>
            {!dayFree && <Button variant="outline" className="flex-1" onClick={() => { act((d) => setMealFree(d, meal.id, true)); onClose() }}>Refeição livre</Button>}
            <Button className="flex-[1.4]" disabled={dayFree} onClick={() => { act((d) => toggleMeal(d, meal.id)); onClose() }}><Check aria-hidden="true" />Comi esta</Button>
          </>
        )}
      </BottomBar>

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
            <SheetBody>
              {sheet === 'more' ? (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-2 text-title font-semibold text-strong">{meal.name}</DrawerTitle>
                  <DrawerDescription className="sr-only">Mais opções da refeição</DrawerDescription>
                  <Card size="flush" variant="inset"><ul>
                    {!free && <SheetRow icon={<ArrowLeftRight size={18} className="text-accent" aria-hidden="true" />} label="Trocar por refeição de outro cardápio" onClick={() => setSheet('swap')} />}
                    <SheetRow icon={<Sparkles size={18} className="text-accent" aria-hidden="true" />} label={meal.free ? 'Desfazer refeição livre' : 'Refeição livre'} onClick={() => {
                      setSheet(undefined)
                      act((d) => setMealFree(d, meal.id, !meal.free))
                      if (!meal.free) onClose()
                    }} />
                  </ul></Card>
                </>
              ) : (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-1 text-title font-semibold text-strong">{`Trocar refeição · ${meal.name}`}</DrawerTitle>
                  <DrawerDescription className="pb-3 text-meta text-text-2">Só hoje. O cardápio não muda.</DrawerDescription>
                  {!groups.length && <p className="text-meta text-text-2">Sem refeições em outros cardápios.</p>}
                  {groups.map((g) => (
                    <div key={g.id} className="flex flex-col gap-1.5 pt-3">
                      <h3 className="label-section">{g.label}</h3>
                      <Card size="flush" variant="inset"><ul aria-label={g.label}>
                        {g.rows.map((r) => (
                          <li key={r.id} className="border-t border-line first:border-t-0">
                            <Button variant="ghost" className="h-auto min-h-14 w-full flex-col items-start justify-center gap-0 rounded-none px-3.5 py-2.5 text-left font-normal" onClick={() => { act((d) => swapMeal(d, meal.id, { name: r.name, items: r.items })); setSheet(undefined) }}>
                              <span className="text-body font-semibold text-strong">{r.title}</span>
                              <span className="max-w-full truncate text-caption text-text-2">{`${formatDec(kcalOf(r.items))} kcal · ${r.items.map((i) => i.name).join(' + ')}`}</span>
                            </Button>
                          </li>
                        ))}
                      </ul></Card>
                    </div>
                  ))}
                </>
              )}
            </SheetBody>
          </DrawerContent>
        </Drawer>
      )}
    </Overlay>
  )
}
