import { useState } from 'react'
import { Check, Droplet, ListChecks, MoreHorizontal, Pencil, Sparkles } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { formatDayLabel } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { TabHeader } from '@/components/TabHeader'
import { Overlay } from '@/components/Overlay'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SheetBody, SheetRow } from '@/components/SheetRow'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { currentMealId, daySummary, mealOptions, optionLetter, sortedMeals, toggleMeal } from './day'
import { kcalOf } from './food'
import { savePlan } from './plan'
import { useDietToday } from './useDietToday'
import { useWater } from './useWater'
import { DietEditor } from './DietEditor'
import { DietStart } from './DietStart'
import { MealScreen } from './MealScreen'
import { WaterCard } from './WaterCard'

const RING_R = 19
const RING_C = 2 * Math.PI * RING_R

export function DietTab() {
  const { now, today, tick, plan, day, menu: dayMenu, act, pickMenu, switchMenu } = useDietToday()
  const [, setPlan] = usePersisted('dietPlan')
  const water = useWater()
  const [editing, setEditing] = useState(false)
  const [openId, setOpenId] = useState<string>()
  const [confirmMenu, setConfirmMenu] = useState<{ menuId: string; date: string }>()
  const [sheet, setSheet] = useState<'more' | 'menus' | 'water'>()
  if (openId && !day?.meals.some((m) => m.id === openId)) setOpenId(undefined)

  const close = () => setEditing(false)
  if (editing) return <Overlay><DietEditor initial={plan} onSave={(next) => { setPlan((p) => savePlan(p, next)); close() }} onCancel={close} /></Overlay>

  if (!day || !plan.menus.length) {
    return (
      <>
        <TabHeader eyebrow="Dieta" />
        <DietStart hint="Um cardápio pra seguir no dia a dia. Dá pra mudar quando quiser." />
      </>
    )
  }

  const s = daySummary(day)
  const pick = (menuId: string) => setConfirmMenu(pickMenu(menuId))

  const goal = day.goalKcal
  const gm = day.goalMacros
  const macros = ([['P', s.p, gm?.p], ['C', s.c, gm?.c], ['G', s.f, gm?.f]] as const).map(([l, done, t]) => `${l} ${Math.round(done)}${t ? `/${Math.round(t)}` : ''}`)
  const pct = goal ? Math.min(100, Math.round((s.kcal / goal) * 100)) : 0
  const nowId = day.free ? undefined : currentMealId(day.meals, now)

  const openMeal = day.meals.find((m) => m.id === openId)
  if (openMeal) return <MealScreen mealId={openMeal.id} onClose={() => { setOpenId(undefined); tick() }} />

  const menuRow = (id: string, name: string) => (
    <li key={id} className="border-t border-line first:border-t-0">
      <Button
        variant="ghost" aria-current={id === day.menuId ? 'true' : undefined} disabled={!plan.menus.some((m) => m.id === id)}
        className="h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3 text-[15px] font-normal text-strong disabled:text-text-2"
        onClick={() => { setSheet(undefined); if (id !== day.menuId) pick(id) }}
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {id === day.menuId && <Check size={18} className="shrink-0 text-accent" aria-hidden="true" />}
      </Button>
    </li>
  )

  return (
    <div className="flex flex-col gap-2.5 pb-6">
      <TabHeader
        eyebrow={`${formatDayLabel(today)} · ${day.menuName}`} title="Dieta"
        actions={<Button variant="outline" size="icon" aria-label="Mais opções da dieta" onClick={() => setSheet('more')}><MoreHorizontal aria-hidden="true" /></Button>}
      />

      <Card role="group" aria-label="Calorias" className="flex-row items-center gap-3 p-3.5">
        {!!goal && (
          <svg role="img" aria-label={`${pct}% da meta`} viewBox="0 0 44 44" className="size-11 shrink-0 -rotate-90">
            <circle cx="22" cy="22" r={RING_R} fill="none" strokeWidth="4" className="stroke-line" />
            <circle cx="22" cy="22" r={RING_R} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-accent" strokeDasharray={`${(pct / 100) * RING_C} ${RING_C}`} />
            <text x="22" y="22" dy=".35em" textAnchor="middle" transform="rotate(90 22 22)" className="fill-strong text-[11px] font-semibold">{`${pct}%`}</text>
          </svg>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tabular-nums text-strong">{goal ? `${formatDec(s.kcal)} / ${formatDec(goal)} kcal` : `${formatDec(s.kcal)} kcal`}</div>
          {/* cada macro é uma unidade: a linha quebra entre eles, nunca no meio de um número */}
          <div className={cn('flex flex-wrap gap-x-2.5 text-[12.5px] tabular-nums', day.free ? 'text-accent' : 'text-text-2')}>
            {day.free ? 'Dia livre' : macros.map((m) => <span key={m} className="whitespace-nowrap">{m}</span>)}
          </div>
        </div>
        {water.on && (
          <Button
            variant="outline" aria-label={`Água: ${formatDec(water.ml / 1000)} de ${formatDec(water.on.goalMl / 1000)} litros`} onClick={() => setSheet('water')}
            className="border-c2/40 bg-c2/15 px-3 text-[12.5px] tabular-nums text-c2 hover:bg-c2/25 hover:text-c2"
          >
            <Droplet aria-hidden="true" />{`${formatDec(water.ml / 1000)}/${formatDec(water.on.goalMl / 1000)} L`}
          </Button>
        )}
      </Card>

      <Card className={cn('overflow-hidden', day.free && 'opacity-50')}>
      <ul aria-label="Refeições">
        {sortedMeals(day.meals).map((m) => {
          const { options, index, canToggle: many } = mealOptions(plan, day, m.id)
          const sub = m.free ? 'livre' : !m.done && many ? `${options.length} opções` : `${formatDec(kcalOf(m.items.filter((i) => !i.skipped)))} kcal`
          const isNow = m.id === nowId
          return (
            <li key={m.id} aria-current={isNow ? 'true' : undefined} className={cn('flex items-center gap-2 border-t border-line px-3.5 first:border-t-0', isNow && 'bg-accent-bg')}>
              <Button variant="ghost" className="h-auto min-h-14 min-w-0 flex-1 justify-start gap-3 rounded-none px-0 py-2.5 text-left font-normal hover:bg-transparent" onClick={() => setOpenId(m.id)}>
                <span className={cn('w-10 shrink-0 text-[12px] tabular-nums', isNow ? 'text-accent' : 'text-faint')}>{m.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-strong">{m.name}</span>
                  <span className="block truncate text-[12.5px] text-text-2">{sub}</span>
                </span>
                {m.done && !m.free && many && (
                  <span className="shrink-0 rounded-md border border-accent-line px-1.5 text-[11px] font-semibold text-accent">{optionLetter(index)}</span>
                )}
              </Button>
              <Checkbox
                size="check" shape="round" checked={m.done} aria-label={`${m.name} feita`} disabled={!!day.free} icon={m.free ? <Sparkles className="size-4" aria-hidden="true" /> : undefined}
                onCheckedChange={() => act((d) => toggleMeal(d, m.id))}
              />
            </li>
          )
        })}
      </ul>
      </Card>

      {!water.on && (
        <Button variant="ghost" className="w-full text-accent" onClick={water.turnOn}>
          Ligar contador de água
        </Button>
      )}

      {sheet && (
        <Drawer open onOpenChange={(o) => !o && setSheet(undefined)}>
          <DrawerContent>
            <SheetBody>
              {sheet === 'water' && water.on ? (
                <>
                  <DrawerTitle className="sr-only">Água</DrawerTitle>
                  <DrawerDescription className="sr-only">Copos de água de hoje</DrawerDescription>
                  <WaterCard ml={water.ml} settings={water.on} onAdd={() => water.act(1)} onRemove={() => water.act(-1)} />
                </>
              ) : sheet === 'menus' ? (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-1 text-[19px] font-semibold text-strong">Cardápio de hoje</DrawerTitle>
                  <DrawerDescription className="pb-3 text-[13px] text-text-2">Vale pra hoje e pros próximos dias.</DrawerDescription>
                  <Card variant="inset" className="overflow-hidden"><ul aria-label="Cardápios">
                    {!dayMenu && menuRow(day.menuId, day.menuName)}
                    {plan.menus.map((m) => menuRow(m.id, m.name))}
                  </ul></Card>
                </>
              ) : (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-2 text-[19px] font-semibold text-strong">Dieta</DrawerTitle>
                  <DrawerDescription className="sr-only">Mais opções da dieta</DrawerDescription>
                  <Card variant="inset" className="overflow-hidden"><ul>
                    {plan.menus.length > 1 && <SheetRow icon={<ListChecks size={18} className="text-accent" aria-hidden="true" />} label="Cardápio de hoje" onClick={() => setSheet('menus')} />}
                    <SheetRow icon={<Sparkles size={18} className="text-accent" aria-hidden="true" />} label={day.free ? 'Desfazer dia livre' : 'Dia livre'} onClick={() => { setSheet(undefined); act((d) => ({ ...d, free: !d.free })) }} />
                    <SheetRow icon={<Pencil size={18} className="text-accent" aria-hidden="true" />} label="Editar cardápio" onClick={() => { setSheet(undefined); setEditing(true) }} />
                  </ul></Card>
                </>
              )}
            </SheetBody>
          </DrawerContent>
        </Drawer>
      )}

      <ConfirmDialog
        open={!!confirmMenu} title="Trocar o cardápio de hoje?" text="O que você marcou hoje será apagado." confirm="Trocar" destructive
        onConfirm={() => confirmMenu && switchMenu(confirmMenu.menuId, confirmMenu.date)} onCancel={() => setConfirmMenu(undefined)}
      />
    </div>
  )
}
