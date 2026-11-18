import { Fragment, useState } from 'react'
import { Check, Droplet, ListChecks, MoreHorizontal, Pencil, Plus, Sparkles, Upload, Utensils } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { formatDayLabel } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
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
import { DietImport } from './DietImport'
import { MealScreen } from './MealScreen'
import { WaterCard } from './WaterCard'

const SHEET_CARD = 'overflow-hidden rounded-[14px] border border-border bg-surface'
const RING_R = 19
const RING_C = 2 * Math.PI * RING_R

export function DietTab() {
  const { now, today, tick, plan, day, menu: dayMenu, act, pickMenu, switchMenu } = useDietToday()
  const [, setPlan] = usePersisted('dietPlan')
  const water = useWater()
  const [view, setView] = useState<'edit' | 'ia' | 'import'>()
  const [openId, setOpenId] = useState<string>()
  const [confirmMenu, setConfirmMenu] = useState<{ menuId: string; date: string }>()
  const [sheet, setSheet] = useState<'more' | 'menus' | 'water'>()
  // a refeição aberta sumiu do dia (trocou o cardápio, virou o dia): esquece o id pra ela não reabrir sozinha depois
  if (openId && !day?.meals.some((m) => m.id === openId)) setOpenId(undefined)

  const close = () => setView(undefined)
  if (view === 'edit') return <Overlay><DietEditor initial={plan} onSave={(next) => { setPlan((p) => savePlan(p, next)); close() }} onCancel={close} /></Overlay>
  if (view) return <Overlay><DietImport mode={view} onDone={close} onBack={close} /></Overlay>

  if (!day || !plan.menus.length) {
    return (
      <>
        <div className="label-caps">Dieta</div>
        <EmptyState icon={<Utensils size={30} aria-hidden="true" />} title="Monte seu cardápio">
          <p className="max-w-[240px] text-sm text-text-2">Um cardápio pra seguir no dia a dia. Dá pra mudar quando quiser.</p>
          <Button className="mt-3 w-full max-w-xs" onClick={() => setView('ia')}><Sparkles aria-hidden="true" />Gerar com IA</Button>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2">
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setView('edit')}><Plus aria-hidden="true" />Do zero</Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setView('import')}><Upload aria-hidden="true" />Importar</Button>
          </div>
        </EmptyState>
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
  // fechar relê a hora: a refeição pode ter agido depois da meia-noite
  if (openMeal) return <MealScreen mealId={openMeal.id} onClose={() => { setOpenId(undefined); tick() }} />

  const menuRow = (id: string, name: string) => (
    <li key={id} className="border-t border-line first:border-t-0">
      <button
        type="button" aria-current={id === day.menuId ? 'true' : undefined} disabled={!plan.menus.some((m) => m.id === id)}
        className="flex min-h-14 w-full items-center gap-3 px-3 text-left text-[15px] text-strong disabled:text-text-2"
        onClick={() => { setSheet(undefined); if (id !== day.menuId) pick(id) }}
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {id === day.menuId && <Check size={18} className="shrink-0 text-accent" aria-hidden="true" />}
      </button>
    </li>
  )

  return (
    <div className="pb-6">
      {/* alinhado com a engrenagem flutuante do App e com um respiro antes dela */}
      <div className="mt-(--gear-offset) flex items-center justify-between gap-2 pr-2">
        <span className="label-caps min-w-0 truncate">{`${formatDayLabel(today)} · ${day.menuName}`}</span>
        <button type="button" className="icon-btn" aria-label="Mais opções da dieta" onClick={() => setSheet('more')}><MoreHorizontal size={18} /></button>
      </div>
      <h1 className="mt-0.5 mb-2.5 text-[26px] font-bold tracking-tight text-strong">Dieta</h1>

      <div role="group" aria-label="Calorias" className="mb-2.5 flex items-center gap-2.5 rounded-[14px] border border-border bg-panel px-3 py-2.5">
        {!!goal && (
          <svg role="img" aria-label={`${pct}% da meta`} viewBox="0 0 44 44" className="size-11 shrink-0 -rotate-90">
            <circle cx="22" cy="22" r={RING_R} fill="none" strokeWidth="4" className="stroke-line" />
            <circle cx="22" cy="22" r={RING_R} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-accent" strokeDasharray={`${(pct / 100) * RING_C} ${RING_C}`} />
            <text x="22" y="22" dy=".35em" textAnchor="middle" transform="rotate(90 22 22)" className="fill-strong text-[11px] font-semibold">{`${pct}%`}</text>
          </svg>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tabular-nums text-strong">{goal ? `${formatDec(s.kcal)} / ${formatDec(goal)} kcal` : `${formatDec(s.kcal)} kcal`}</div>
          {/* quebra entre os macros, nunca no meio de um número (320 px com a pílula de água) */}
          <div className={cn('text-[12.5px] tabular-nums', day.free ? 'text-accent' : 'text-text-2')}>
            {day.free ? 'Dia livre' : macros.map((m, i) => <Fragment key={m[0]}>{i > 0 && ' · '}<span className="whitespace-nowrap">{m}</span></Fragment>)}
          </div>
        </div>
        {water.on && (
          <button
            type="button" aria-label={`Água: ${formatDec(water.ml / 1000)} de ${formatDec(water.on.goalMl / 1000)} litros`} onClick={() => setSheet('water')}
            className="relative flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] border border-c2/40 bg-c2/15 px-2 text-[12.5px] font-semibold tabular-nums text-c2 after:absolute after:-inset-1.5"
          >
            <Droplet size={14} aria-hidden="true" />{`${formatDec(water.ml / 1000)}/${formatDec(water.on.goalMl / 1000)} L`}
          </button>
        )}
      </div>

      <ul aria-label="Refeições" className={cn('overflow-hidden rounded-[14px] border border-border bg-panel', day.free && 'opacity-50')}>
        {sortedMeals(day.meals).map((m) => {
          const { options, index, canToggle: many } = mealOptions(plan, day, m.id)
          const sub = m.free ? 'livre' : !m.done && many ? `${options.length} opções` : `${formatDec(kcalOf(m.items.filter((i) => !i.skipped)))} kcal`
          const isNow = m.id === nowId
          return (
            <li key={m.id} aria-current={isNow ? 'true' : undefined} className={cn('flex items-center gap-1 border-t border-line pr-1.5 first:border-t-0', isNow && 'bg-accent-bg')}>
              <button type="button" className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 py-2 pl-3 text-left" onClick={() => setOpenId(m.id)}>
                <span className={cn('w-10 shrink-0 text-[12px] tabular-nums', isNow ? 'text-accent' : 'text-faint')}>{m.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-strong">{m.name}</span>
                  <span className="block truncate text-[12.5px] text-text-2">{sub}</span>
                </span>
                {m.done && !m.free && many && (
                  <span className="shrink-0 rounded-md border border-accent-line px-1.5 text-[11px] font-semibold text-accent">{optionLetter(index)}</span>
                )}
              </button>
              <button
                type="button" aria-label={`${m.done ? 'Desmarcar' : 'Marcar'} ${m.name}`} disabled={!!day.free} className="flex size-11 shrink-0 items-center justify-center"
                onClick={() => act((d) => toggleMeal(d, m.id))}
              >
                <span className={cn('flex size-7 items-center justify-center rounded-full border-[1.5px]', m.done ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-transparent')}>
                  {m.free ? <Sparkles size={14} aria-hidden="true" /> : <Check size={15} strokeWidth={3} aria-hidden="true" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {!water.on && (
        <Button variant="ghost" className="mt-3 h-11 w-full text-accent" onClick={water.turnOn}>
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
                  <ul aria-label="Cardápios" className={SHEET_CARD}>
                    {!dayMenu && menuRow(day.menuId, day.menuName)}
                    {plan.menus.map((m) => menuRow(m.id, m.name))}
                  </ul>
                </>
              ) : (
                <>
                  <DrawerTitle className="shrink-0 truncate pb-2 text-[19px] font-semibold text-strong">Dieta</DrawerTitle>
                  <DrawerDescription className="sr-only">Mais opções da dieta</DrawerDescription>
                  <ul className={SHEET_CARD}>
                    {plan.menus.length > 1 && <SheetRow icon={<ListChecks size={18} className="text-accent" aria-hidden="true" />} label="Cardápio de hoje" onClick={() => setSheet('menus')} />}
                    <SheetRow icon={<Sparkles size={18} className="text-accent" aria-hidden="true" />} label={day.free ? 'Desfazer dia livre' : 'Dia livre'} onClick={() => { setSheet(undefined); act((d) => ({ ...d, free: !d.free })) }} />
                    <SheetRow icon={<Pencil size={18} className="text-accent" aria-hidden="true" />} label="Editar cardápio" onClick={() => { setSheet(undefined); setView('edit') }} />
                  </ul>
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
