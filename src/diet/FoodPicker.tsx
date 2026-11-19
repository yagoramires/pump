import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import type { DietItem, Per100 } from './types'
import { usePersisted } from '@/storage/db'
import { fetchTaco } from '@/catalog/catalog'
import { searchByName } from '@/catalog/search'
import { useCatalog } from '@/catalog/useCatalog'
import { SearchField } from '@/components/SearchField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { todayKey } from '@/lib/date'
import { formatDec, parseDecimal } from '@/lib/number'
import { cn } from '@/lib/utils'
import { MACRO_KEYS, asFood, type Food, foodKey, fromTaco } from './food'
import { recentFoods } from './day'
import { MACRO_LABELS, iaLabel } from './display'
import { GRAMS } from './limits'

type Props = {
  title: string
  initialGrams?: number
  confirmLabel: string
  onPick: (item: DietItem) => void
  onClose: () => void
  extraAction?: { label: string; onClick: () => void }
}

function Rows({ label, foods, selected, onSelect }: { label: string; foods: Food[]; selected?: string; onSelect: (f: Food) => void }) {
  return (
    <Card size="flush" variant="inset"><ul aria-label={label}>
      {foods.map((f) => {
        const on = foodKey(f.name) === selected
        const source = iaLabel(f)
        return (
          <li key={f.name} className="border-t border-line first:border-t-0">
            <Toggle pressed={on} onPressedChange={() => onSelect(f)} className="h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3.5 py-2.5 text-left font-normal">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-strong">{f.name}</span>
                <span className="block text-caption tabular-nums text-text-2">{Math.round(f.per100.kcal)} kcal · P {formatDec(f.per100.p)} g por 100 g</span>
                {source && <span className="block text-caption text-c7">{source}</span>}
              </span>
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', on ? 'bg-accent text-on-accent' : 'text-accent')}>{on ? <Check size={16} /> : <Plus size={18} />}</span>
            </Toggle>
          </li>
        )
      })}
    </ul></Card>
  )
}

export function FoodPicker({ title, initialGrams = 100, confirmLabel, onPick, onClose, extraAction }: Props) {
  const { list: taco, offline } = useCatalog(fetchTaco)
  const [plan] = usePersisted('dietPlan')
  const [log] = usePersisted('dietLog')
  const [foods, setFoods] = usePersisted('foods')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Food>()
  const [grams, setGrams] = useState(initialGrams)
  const [portion, setPortion] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', kcal: '', p: '', c: '', f: '' })

  const recents = useMemo(() => recentFoods(plan, log, foods, todayKey()), [foods, plan, log])

  const shownRecents = searchByName(recents, q).slice(0, 100)
  const results = q.trim() ? searchByName(taco, q).slice(0, 100).map(fromTaco) : []

  const pick = () => sel && onPick({ id: crypto.randomUUID(), ...sel, grams, ...(portion.trim() && { portion: portion.trim() }) })

  const num = (s: string) => (s.trim() ? parseDecimal(s) : 0)
  const values = { kcal: draft.kcal.trim() ? parseDecimal(draft.kcal) : null, p: num(draft.p), c: num(draft.c), f: num(draft.f) }
  const dup = !!draft.name.trim() && foods.some((f) => foodKey(f.name) === foodKey(draft.name))
  const valid = !!draft.name.trim() && !dup && Object.values(values).every((v) => v !== null)
  const create = () => {
    if (!valid) return
    const item: DietItem = { id: crypto.randomUUID(), name: draft.name.trim(), grams: 100, per100: values as Per100, source: 'custom' }
    setFoods((prev) => [...prev, item])
    setSel(asFood(item))
    setCreating(false)
  }
  const field = (k: keyof typeof draft, label: string, placeholder: string, decimal = true) => (
    <Input key={k} aria-label={label} placeholder={placeholder} autoComplete="off" {...(decimal && { inputMode: 'decimal' as const })} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
  )

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex min-h-0 flex-col gap-3 px-4 pt-2 pb-5">
          <DrawerTitle className="shrink-0 truncate text-title font-semibold text-strong">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">Escolha um alimento e a quantidade</DrawerDescription>
          {creating ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create() }}>
              <h2 className="text-body font-semibold text-strong">Alimento próprio</h2>
              {field('name', 'Nome do alimento', 'Nome', false)}
              {dup && <p role="alert" className="text-meta text-negative">Já existe um alimento com esse nome</p>}
              <p className="text-caption text-text-2">Valores por 100 g</p>
              <div className="grid grid-cols-2 gap-2">
                {field('kcal', 'kcal por 100 g', 'kcal')}
                {MACRO_KEYS.map((k) => field(k, `${MACRO_LABELS[k]} por 100 g`, `${MACRO_LABELS[k]} (g)`))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={!valid}>Criar</Button>
              </div>
            </form>
          ) : (
            <>
              <SearchField className="shrink-0" placeholder="Buscar alimento" aria-label="Buscar alimento" value={q} onChange={(e) => setQ(e.target.value)} />
              {offline && <p className="text-meta text-text-2">Sem internet para buscar na TACO</p>}
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {shownRecents.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <h3 className="label-caps">Recentes e do cardápio</h3>
                    <Rows label="Recentes e do cardápio" foods={shownRecents} selected={sel && foodKey(sel.name)} onSelect={setSel} />
                  </div>
                )}
                {results.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <h3 className="label-caps">TACO</h3>
                    <Rows label="Resultados da TACO" foods={results} selected={sel && foodKey(sel.name)} onSelect={setSel} />
                  </div>
                )}
                {!shownRecents.length && !results.length && <p className="text-meta text-text-2">{q.trim() ? 'Nada encontrado' : 'Busque um alimento'}</p>}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3">
                <span className="text-sm text-text-2">Quantidade</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label="Diminuir quantidade" disabled={grams <= GRAMS[0]} onClick={() => setGrams((g) => Math.max(GRAMS[0], g - 10))}><Minus aria-hidden="true" /></Button>
                  <span className="min-w-16 text-center text-base font-semibold tabular-nums text-strong">{formatDec(grams)} g</span>
                  <Button variant="outline" size="icon" aria-label="Aumentar quantidade" disabled={grams >= GRAMS[1]} onClick={() => setGrams((g) => Math.min(GRAMS[1], g + 10))}><Plus aria-hidden="true" /></Button>
                </div>
              </div>
              <Input aria-label="Porção" className="shrink-0" placeholder="Porção (opcional), ex.: 2 un" autoComplete="off" value={portion} onChange={(e) => setPortion(e.target.value)} />
              <div className="flex gap-2">
                {extraAction && <Button variant="outline" className="flex-1" onClick={extraAction.onClick}>{extraAction.label}</Button>}
                <Button className="flex-1" disabled={!sel} onClick={pick}>{confirmLabel}</Button>
              </div>
              <Button variant="link" className="text-accent" onClick={() => setCreating(true)}>Criar alimento próprio</Button>
            </>
          )}
          <p className="text-center text-caption text-faint">Valores: TACO 4ª ed. (NEPA/UNICAMP)</p>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
