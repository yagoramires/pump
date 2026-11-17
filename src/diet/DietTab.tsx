import { useEffect, useState } from 'react'
import { Pencil, Plus, Sparkles, Upload, Utensils } from 'lucide-react'
import type { DietDay, DietLog, DietPlan, WaterLog } from '../types'
import { DEFAULT_SETTINGS, EMPTY_DIET, NO_PROFILE } from '../types'
import { usePersisted } from '../storage/db'
import { formatDayLabel, todayKey } from '../lib/date'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Overlay } from '@/components/Overlay'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { currentMenu, dayFromMenu, daySummary, ensureDay, setDayFree, setDayMenu, sortedMeals, touched } from './day'
import { addCup, removeCup, waterDefaults } from './water'
import { DietEditor } from './DietEditor'
import { DietImport } from './DietImport'
import { MealCard } from './MealCard'
import { WaterCard } from './WaterCard'

const NO_LOG: DietLog = {}
const NO_WATER: WaterLog = {}
const LABEL = 'text-[10px] font-semibold uppercase tracking-[.05em] text-faint'
const uuid = () => crypto.randomUUID()
const fromScratch = (): DietPlan => ({
  menus: [{ id: uuid(), name: 'Cardápio 1', meals: [{ id: uuid(), name: 'Refeição 1', time: '', options: [{ id: uuid(), items: [] }] }] }],
})

export function DietTab() {
  const [today, setToday] = useState(() => todayKey())
  const [plan, setPlan, planLoaded] = usePersisted('dietPlan', EMPTY_DIET)
  const [log, setLog, logLoaded] = usePersisted('dietLog', NO_LOG)
  const [water, setWater, waterLoaded] = usePersisted('waterLog', NO_WATER)
  const [settings, setSettings, settingsLoaded] = usePersisted('settings', DEFAULT_SETTINGS)
  const [profile, , profileLoaded] = usePersisted('profile', NO_PROFILE)
  const [view, setView] = useState<{ kind: 'edit'; initial?: DietPlan } | { kind: 'ia' | 'import' }>()
  const [openId, setOpenId] = useState<string>()
  const [confirmMenu, setConfirmMenu] = useState<string>()

  // o PWA volta do segundo plano sem remontar: passou da meia-noite, mostra o dia novo
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setToday(todayKey())
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
  const s = daySummary(day)
  // a data é lida na hora do toque: uma ação depois da meia-noite vai pro dia novo
  const act = (f: (d: DietDay) => DietDay) => {
    const date = todayKey()
    setToday(date)
    setLog((l) => {
      const next = ensureDay(l, plan, date)
      return next[date] ? { ...next, [date]: f(next[date]) } : next
    })
  }
  const switchMenu = (menuId: string) => {
    const date = todayKey()
    setToday(date)
    setLog((l) => setDayMenu(l, plan, date, menuId))
    setPlan((p) => ({ ...p, lastMenuId: menuId }))
  }
  const pickMenu = (menuId: string) => (log[todayKey()] && touched(log[todayKey()]) ? setConfirmMenu(menuId) : switchMenu(menuId))

  const goal = day.goalKcal
  const macro = (label: string, done: number, target?: number) => (
    <div>
      <div className="text-[11.5px] text-faint">{label}</div>
      <div className="text-[13px] font-semibold tabular-nums text-strong">{target ? `${formatDec(done)}/${formatDec(target)} g` : `${formatDec(done)} g`}</div>
    </div>
  )
  const waterOn = settings.water?.enabled ? settings.water : undefined

  return (
    <div className="pb-6">
      <div className={LABEL}>{formatDayLabel(today)}</div>
      <h1 className="mt-0.5 mb-3 text-[26px] font-bold tracking-tight text-strong">Dieta</h1>

      <div className="mb-2.5 flex items-center gap-2">
        {plan.menus.length > 1 ? (
          <select
            aria-label="Cardápio de hoje" value={day.menuId} onChange={(e) => pickMenu(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-panel px-3 text-base text-strong"
          >
            {plan.menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-text-2">{day.menuName}</span>
        )}
        <Button variant={day.free ? 'secondary' : 'outline'} className="h-11" onClick={() => act((d) => setDayFree(d, !d.free))}>
          {day.free ? 'Desfazer dia livre' : 'Dia livre'}
        </Button>
      </div>

      <div role="group" aria-label="Calorias" className="mb-2.5 rounded-[14px] border border-border bg-panel p-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-text-2">Calorias</span>
          <span className="font-semibold tabular-nums text-strong">
            {formatDec(s.kcal)} <span className="text-[13px] font-normal text-text-2">{goal ? `/ ${formatDec(goal)} kcal` : 'kcal'}</span>
          </span>
        </div>
        {!!goal && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (s.kcal / goal) * 100)}%` }} />
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {macro('Proteína', s.p, day.goalMacros?.p)}
          {macro('Carbo', s.c, day.goalMacros?.c)}
          {macro('Gordura', s.f, day.goalMacros?.f)}
        </div>
      </div>

      {waterOn ? (
        <WaterCard
          ml={water[today]?.ml ?? 0} settings={waterOn}
          onAdd={() => setWater((w) => addCup(w, todayKey(), waterOn))}
          onRemove={() => setWater((w) => removeCup(w, todayKey(), waterOn))}
        />
      ) : (
        <Button
          variant="ghost" className="mb-2.5 h-11 w-full text-accent" disabled={!profileLoaded}
          onClick={() => setSettings((st) => ({ ...st, water: waterDefaults(profile.weightKg) }))}
        >
          Ligar contador de água
        </Button>
      )}

      <ul aria-label="Refeições" className={cn('overflow-hidden rounded-[14px] border border-border bg-panel', day.free && 'opacity-50')}>
        {sortedMeals(day.meals).map((m) => (
          <MealCard key={m.id} meal={m} plan={plan} menuId={day.menuId} dayFree={!!day.free} open={openId === m.id} onOpen={() => setOpenId(openId === m.id ? undefined : m.id)} act={act} />
        ))}
      </ul>

      <Button variant="ghost" className="mt-3 h-11 w-full text-accent" onClick={() => setView({ kind: 'edit' })}><Pencil aria-hidden="true" />Editar cardápio</Button>

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
