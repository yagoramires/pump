import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, Search } from 'lucide-react'
import type { DietItem, DietLog, Per100, TacoFood } from '../types'
import { EMPTY_DIET } from '../types'
import { usePersisted } from '../storage/db'
import { fetchTaco } from '../catalog/catalog'
import { normalize, searchCatalog } from '../catalog/search'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { daysBetween, todayKey } from '@/lib/date'
import { formatDec, parseDecimal } from '@/lib/number'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  initialGrams?: number
  confirmLabel: 'Trocar' | 'Adicionar' | 'Usar'
  onPick: (item: DietItem) => void
  onClose: () => void
  extraAction?: { label: string; onClick: () => void }
}

/** alimento sem quantidade: o que a lista mostra e o que vira DietItem */
type Food = { name: string; per100: Per100; source: DietItem['source']; tacoId?: number }

const NO_FOODS: DietItem[] = []
const NO_LOG: DietLog = {}
const LABEL = 'pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[.04em] text-faint'
const ROUND = 'flex size-11 touch-manipulation items-center justify-center rounded-xl border border-border text-strong disabled:opacity-40'
const toFood = ({ name, per100, source, tacoId }: Food): Food => ({ name, per100, source, ...(tacoId !== undefined && { tacoId }) })
const fromTaco = ({ id, name, kcal, p, c, f }: TacoFood): Food => ({ name, per100: { kcal, p, c, f }, source: 'taco', tacoId: id })

function Rows({ label, foods, selected, onSelect }: { label: string; foods: Food[]; selected?: string; onSelect: (f: Food) => void }) {
  return (
    <ul className="overflow-hidden rounded-[14px] border border-border bg-surface" aria-label={label}>
      {foods.map((f) => {
        const on = f.name === selected
        return (
          <li key={f.name} className="border-t border-line first:border-t-0">
            <button type="button" className={cn('flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left', on && 'bg-accent-bg')} aria-pressed={on} onClick={() => onSelect(f)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-strong">{f.name}</span>
                <span className="block text-[12.5px] tabular-nums text-text-2">{Math.round(f.per100.kcal)} kcal · P {formatDec(f.per100.p)} g por 100 g</span>
              </span>
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', on ? 'bg-accent text-on-accent' : 'text-accent')}>{on ? <Check size={16} /> : <Plus size={18} />}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function FoodPicker({ title, initialGrams = 100, confirmLabel, onPick, onClose, extraAction }: Props) {
  const [taco, setTaco] = useState<TacoFood[]>([])
  const [offline, setOffline] = useState(false)
  const [plan] = usePersisted('dietPlan', EMPTY_DIET)
  const [log] = usePersisted('dietLog', NO_LOG)
  const [foods, setFoods] = usePersisted('foods', NO_FOODS)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Food>()
  const [grams, setGrams] = useState(initialGrams)
  const [portion, setPortion] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', kcal: '', p: '', c: '', f: '' })

  useEffect(() => {
    fetchTaco().then(setTaco, () => setOffline(true))
  }, [])

  // criados, do cardápio e dos últimos 14 dias; o primeiro nome visto vence
  const recents = useMemo(() => {
    const today = todayKey()
    const days = Object.keys(log).filter((k) => daysBetween(k, today) < 14).sort().reverse()
    const all = [
      ...foods,
      ...plan.menus.flatMap((m) => m.meals.flatMap((ml) => ml.options.flatMap((o) => o.items))),
      ...days.flatMap((k) => log[k].meals.flatMap((m) => m.items)),
    ]
    const seen = new Map<string, Food>()
    for (const i of all) if (!seen.has(i.name)) seen.set(i.name, toFood(i))
    return [...seen.values()]
  }, [foods, plan, log])

  const shownRecents = searchCatalog(recents, q).slice(0, 100)
  const results = q.trim() ? searchCatalog(taco, q).slice(0, 100).map(fromTaco) : []

  const pick = () => sel && onPick({ id: crypto.randomUUID(), ...sel, grams, ...(portion.trim() && { portion: portion.trim() }) })

  const num = (s: string) => (s.trim() ? parseDecimal(s) : 0)
  const values = { kcal: draft.kcal.trim() ? parseDecimal(draft.kcal) : null, p: num(draft.p), c: num(draft.c), f: num(draft.f) }
  const dup = !!draft.name.trim() && foods.some((f) => normalize(f.name) === normalize(draft.name))
  const valid = !!draft.name.trim() && !dup && Object.values(values).every((v) => v !== null)
  const create = () => {
    if (!valid) return
    const item: DietItem = { id: crypto.randomUUID(), name: draft.name.trim(), grams: 100, per100: values as Per100, source: 'custom' }
    setFoods((prev) => [...prev, item])
    setSel(toFood(item))
    setCreating(false)
  }
  const field = (k: keyof typeof draft, label: string, placeholder: string, decimal = true) => (
    <Input aria-label={label} placeholder={placeholder} autoComplete="off" {...(decimal && { inputMode: 'decimal' as const })} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
  )

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex min-h-0 flex-col px-4 pt-2 pb-5">
          <DrawerTitle className="truncate pb-2 text-[19px] font-semibold text-strong">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">Escolha um alimento e a quantidade</DrawerDescription>
          {creating ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create() }}>
              <h2 className="text-[15px] font-semibold text-strong">Alimento próprio</h2>
              {field('name', 'Nome do alimento', 'Nome', false)}
              {dup && <p role="alert" className="text-[13px] text-negative">Já existe um alimento com esse nome</p>}
              <p className="text-[12.5px] text-text-2">Valores por 100 g</p>
              <div className="grid grid-cols-2 gap-2">
                {field('kcal', 'kcal por 100 g', 'kcal')}
                {field('p', 'Proteína por 100 g', 'Proteína (g)')}
                {field('c', 'Carbo por 100 g', 'Carbo (g)')}
                {field('f', 'Gordura por 100 g', 'Gordura (g)')}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={!valid}>Criar</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute top-3.5 left-3 text-faint" />
                <Input type="search" className="pl-9" placeholder="Buscar alimento" aria-label="Buscar alimento" autoComplete="off" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {offline && <p className="pt-2 text-[13px] text-text-2">Sem internet para buscar na TACO</p>}
              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {shownRecents.length > 0 && (
                  <>
                    <h3 className={LABEL}>Recentes e do cardápio</h3>
                    <Rows label="Recentes e do cardápio" foods={shownRecents} selected={sel?.name} onSelect={setSel} />
                  </>
                )}
                {results.length > 0 && (
                  <>
                    <h3 className={LABEL}>TACO</h3>
                    <Rows label="Resultados da TACO" foods={results} selected={sel?.name} onSelect={setSel} />
                  </>
                )}
                {!shownRecents.length && !results.length && <p className="pt-3 text-[13px] text-text-2">{q.trim() ? 'Nada encontrado' : 'Busque um alimento'}</p>}
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-text-2">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button type="button" className={ROUND} aria-label="Diminuir quantidade" disabled={grams <= 10} onClick={() => setGrams((g) => Math.max(10, g - 10))}><Minus size={16} /></button>
                  <span className="min-w-16 text-center text-base font-semibold tabular-nums text-strong">{formatDec(grams)} g</span>
                  <button type="button" className={ROUND} aria-label="Aumentar quantidade" disabled={grams >= 2000} onClick={() => setGrams((g) => Math.min(2000, g + 10))}><Plus size={16} /></button>
                </div>
              </div>
              <Input aria-label="Porção" placeholder="Porção (opcional), ex.: 2 un" autoComplete="off" value={portion} onChange={(e) => setPortion(e.target.value)} />
              <div className="mt-3 flex gap-2">
                {extraAction && <Button variant="outline" className="flex-1" onClick={extraAction.onClick}>{extraAction.label}</Button>}
                <Button className="flex-1" disabled={!sel} onClick={pick}>{confirmLabel}</Button>
              </div>
              <Button variant="ghost" className="mt-1 text-accent" onClick={() => setCreating(true)}>Criar alimento próprio</Button>
            </>
          )}
          <p className="pt-2 text-center text-[11px] text-faint">Valores: TACO 4ª ed. (NEPA/UNICAMP)</p>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
