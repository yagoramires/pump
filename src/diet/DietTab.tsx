import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Check, Droplet, ListChecks, MoreHorizontal, Pencil, Plus, Sparkles, Upload, Utensils } from 'lucide-react'
import type { DietDay, DietLog, DietPlan, WaterLog } from '../types'
import { DEFAULT_SETTINGS, EMPTY_DIET, NO_PROFILE } from '../types'
import { usePersisted } from '../storage/db'
import { formatDayLabel, todayKey } from '../lib/date'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Overlay } from '@/components/Overlay'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { currentMealId, currentMenu, dayFromMenu, daySummary, ensureDay, itemKcal, optionLetter, setDayFree, setDayMenu, setMealFree, sortedMeals, toggleMeal, touched } from './day'
import { addCup, removeCup, turnWaterOn } from './water'
import { DietEditor } from './DietEditor'
import { DietImport } from './DietImport'
import { MealScreen } from './MealScreen'
import { WaterCard } from './WaterCard'

const NO_LOG: DietLog = {}
const NO_WATER: WaterLog = {}
const LABEL = 'text-[10px] font-semibold uppercase tracking-[.05em] text-faint'
const SHEET_CARD = 'overflow-hidden rounded-[14px] border border-border bg-surface'
const RING_R = 19
const RING_C = 2 * Math.PI * RING_R
const uuid = () => crypto.randomUUID()
const fromScratch = (): DietPlan => ({
  menus: [{ id: uuid(), name: 'Cardápio 1', meals: [{ id: uuid(), name: 'Refeição 1', time: '', options: [{ id: uuid(), items: [] }] }] }],
})

export function DietTab() {
  const [now, setNow] = useState(() => new Date()) // relógio da tela: dia mostrado e refeição destacada
  const today = todayKey(now)
  const [plan, setPlan, planLoaded] = usePersisted('dietPlan', EMPTY_DIET)
  const [log, setLog, logLoaded] = usePersisted('dietLog', NO_LOG)
  const [water, setWater, waterLoaded] = usePersisted('waterLog', NO_WATER)
  const [settings, setSettings, settingsLoaded] = usePersisted('settings', DEFAULT_SETTINGS)
  const [profile, , profileLoaded] = usePersisted('profile', NO_PROFILE)
  const [view, setView] = useState<{ kind: 'edit'; initial?: DietPlan } | { kind: 'ia' | 'import' }>()
  const [openId, setOpenId] = useState<string>()
  const [confirmMenu, setConfirmMenu] = useState<string>()
  const [sheet, setSheet] = useState<'more' | 'menus' | 'water'>()
  // a refeição aberta sumiu do dia (trocou o cardápio, virou o dia): esquece o id pra ela não reabrir sozinha depois
  const openGone = !!openId && !(log[today]?.meals ?? currentMenu(plan)?.meals ?? []).some((m) => m.id === openId)
  // oxlint-disable-next-line react/set-state-in-effect -- o dia muda por fora do componente (storage, virada do dia), não por um evento daqui
  useEffect(() => { if (openGone) setOpenId(undefined) }, [openGone])

  // o PWA volta do segundo plano sem remontar: passou da meia-noite, mostra o dia novo
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!planLoaded || !logLoaded || !waterLoaded || !settingsLoaded) return <p className="text-sm text-text-2">Carregando…</p>

  const close = () => setView(undefined)
  if (view?.kind === 'edit') return <Overlay><DietEditor initial={view.initial} onDone={close} onCancel={close} /></Overlay>
  if (view) return <Overlay><DietImport mode={view.kind} onDone={close} onBack={close} /></Overlay>

  const menu = currentMenu(plan)
  if (!menu) {
    return (
      <>
        <div className={LABEL}>Dieta</div>
        <EmptyState icon={<Utensils size={30} aria-hidden="true" />} title="Monte seu cardápio">
          <p className="max-w-[240px] text-sm text-text-2">Um cardápio pra seguir no dia a dia. Dá pra mudar quando quiser.</p>
          <Button className="mt-3 w-full max-w-xs" onClick={() => setView({ kind: 'ia' })}><Sparkles aria-hidden="true" />Gerar com IA</Button>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2">
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setView({ kind: 'edit', initial: fromScratch() })}><Plus aria-hidden="true" />Do zero</Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setView({ kind: 'import' })}><Upload aria-hidden="true" />Importar</Button>
          </div>
        </EmptyState>
      </>
    )
  }

  const day = log[today] ?? dayFromMenu(menu)
  // a data é lida na hora do toque (uma ação depois da meia-noite vai pro dia novo) e o relógio da tela anda junto
  const tick = () => {
    // oxlint-disable-next-line react/purity -- roda no toque, não no render
    const at = new Date()
    setNow(at)
    return todayKey(at)
  }
  const s = daySummary(day)
  const act = (f: (d: DietDay) => DietDay) => {
    const date = tick()
    setLog((l) => {
      const next = ensureDay(l, plan, date)
      return next[date] ? { ...next, [date]: f(next[date]) } : next
    })
  }
  const switchMenu = (menuId: string) => {
    const date = tick()
    setLog((l) => setDayMenu(l, plan, date, menuId))
    setPlan((p) => ({ ...p, lastMenuId: menuId }))
  }
  const pickMenu = (menuId: string) => (log[todayKey()] && touched(log[todayKey()]) ? setConfirmMenu(menuId) : switchMenu(menuId))

  const goal = day.goalKcal
  const gm = day.goalMacros
  const macros = ([['P', s.p, gm?.p], ['C', s.c, gm?.c], ['G', s.f, gm?.f]] as const).map(([l, done, t]) => `${l} ${Math.round(done)}${t ? `/${Math.round(t)}` : ''}`)
  const pct = goal ? Math.min(100, Math.round((s.kcal / goal) * 100)) : 0
  const waterOn = settings.water?.enabled ? settings.water : undefined
  const waterMl = water[today]?.ml ?? 0
  const waterAct = (f: typeof addCup) => {
    const date = tick()
    setWater((w) => f(w, date, waterOn!))
  }
  const dayMenu = plan.menus.find((m) => m.id === day.menuId)
  const nowId = day.free ? undefined : currentMealId(day.meals, now)
  const isFree = (d: DietDay, id: string) => !!d.meals.find((m) => m.id === id)?.free // decide no salvo, não no render

  // a refeição aberta é relida do dia a cada render; sumiu, mostra a lista (o efeito lá em cima limpa o id)
  const openMeal = day.meals.find((m) => m.id === openId)
  if (openMeal) return <MealScreen meal={openMeal} menu={dayMenu} plan={plan} dayFree={!!day.free} act={act} onClose={() => setOpenId(undefined)} />

  const sheetRow = (icon: ReactNode, label: string, onClick: () => void) => (
    <li className="border-t border-line first:border-t-0">
      <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 text-left text-[15px] text-strong" onClick={onClick}>{icon}{label}</button>
    </li>
  )
  const menuRow = (id: string, name: string) => (
    <li key={id} className="border-t border-line first:border-t-0">
      <button
        type="button" aria-current={id === day.menuId ? 'true' : undefined} disabled={!plan.menus.some((m) => m.id === id)}
        className="flex min-h-14 w-full items-center gap-3 px-3 text-left text-[15px] text-strong disabled:text-text-2"
        onClick={() => { setSheet(undefined); if (id !== day.menuId) pickMenu(id) }}
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {id === day.menuId && <Check size={18} className="shrink-0 text-accent" aria-hidden="true" />}
      </button>
    </li>
  )

  return (
    <div className="pb-6">
      {/* alinhado com a engrenagem flutuante do App (-mt-1.5) e com um respiro antes dela */}
      <div className="-mt-1.5 flex items-center justify-between gap-2 pr-2">
        <span className={cn(LABEL, 'min-w-0 truncate')}>{`${formatDayLabel(today)} · ${day.menuName}`}</span>
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
        {waterOn && (
          <button
            type="button" aria-label={`Água: ${formatDec(waterMl / 1000)} de ${formatDec(waterOn.goalMl / 1000)} litros`} onClick={() => setSheet('water')}
            className="relative flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] border border-c2/40 bg-c2/15 px-2 text-[12.5px] font-semibold tabular-nums text-c2 after:absolute after:-inset-1.5"
          >
            <Droplet size={14} aria-hidden="true" />{`${formatDec(waterMl / 1000)}/${formatDec(waterOn.goalMl / 1000)} L`}
          </button>
        )}
      </div>

      <ul aria-label="Refeições" className={cn('overflow-hidden rounded-[14px] border border-border bg-panel', day.free && 'opacity-50')}>
        {sortedMeals(day.meals).map((m) => {
          const options = dayMenu?.meals.find((x) => x.id === m.id)?.options ?? []
          const many = options.length > 1 && !m.swappedMeal
          const sub = m.free ? 'livre' : !m.done && many ? `${options.length} opções` : `${formatDec(Math.round(m.items.filter((i) => !i.skipped).reduce((t, i) => t + itemKcal(i), 0)))} kcal`
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
                  <span className="shrink-0 rounded-md border border-accent-line px-1.5 text-[11px] font-semibold text-accent">{optionLetter(Math.max(0, options.findIndex((o) => o.id === m.optionId)))}</span>
                )}
              </button>
              <button
                type="button" aria-label={`${m.done ? 'Desmarcar' : 'Marcar'} ${m.name}`} disabled={!!day.free} className="flex size-11 shrink-0 items-center justify-center"
                onClick={() => act((d) => (isFree(d, m.id) ? setMealFree(d, m.id, false) : toggleMeal(d, m.id)))}
              >
                <span className={cn('flex size-7 items-center justify-center rounded-full border-[1.5px]', m.done ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-transparent')}>
                  {m.free ? <Sparkles size={14} aria-hidden="true" /> : <Check size={15} strokeWidth={3} aria-hidden="true" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {!waterOn && (
        <Button
          variant="ghost" className="mt-3 h-11 w-full text-accent" disabled={!profileLoaded}
          onClick={() => setSettings((st) => ({ ...st, water: turnWaterOn(st.water, profile.weightKg) }))}
        >
          Ligar contador de água
        </Button>
      )}

      {sheet && (
        <Drawer open onOpenChange={(o) => !o && setSheet(undefined)}>
          <DrawerContent>
            <div className="flex min-h-0 flex-col overflow-y-auto px-4 pt-2 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sheet === 'water' && waterOn ? (
                <>
                  <DrawerTitle className="sr-only">Água</DrawerTitle>
                  <DrawerDescription className="sr-only">Copos de água de hoje</DrawerDescription>
                  <WaterCard ml={waterMl} settings={waterOn} onAdd={() => waterAct(addCup)} onRemove={() => waterAct(removeCup)} />
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
                    {plan.menus.length > 1 && sheetRow(<ListChecks size={18} className="text-accent" aria-hidden="true" />, 'Cardápio de hoje', () => setSheet('menus'))}
                    {sheetRow(<Sparkles size={18} className="text-accent" aria-hidden="true" />, day.free ? 'Desfazer dia livre' : 'Dia livre', () => { setSheet(undefined); act((d) => setDayFree(d, !d.free)) })}
                    {sheetRow(<Pencil size={18} className="text-accent" aria-hidden="true" />, 'Editar cardápio', () => { setSheet(undefined); setView({ kind: 'edit' }) })}
                  </ul>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog open={!!confirmMenu} onOpenChange={(o) => !o && setConfirmMenu(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar o cardápio de hoje?</AlertDialogTitle>
            <AlertDialogDescription>O que você marcou hoje será apagado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => switchMenu(confirmMenu!)}>Trocar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
