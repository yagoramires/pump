import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, Copy, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import type { DietAnamnesis, DietItem, DietLog, DietPlan } from '../types'
import { EMPTY_DIET, NO_PROFILE } from '../types'
import { usePersisted } from '../storage/db'
import { fetchTaco } from '../catalog/catalog'
import { PlanFormatError } from '../workout/planFormat'
import { Step } from '../workout/PlanImport'
import { buildDietPrompt } from './prompt'
import { dietFromFormat, parseDietFormat } from './dietFormat'
import { ensureDay, itemKcal, sortedMeals } from './day'
import { DietAnamnesisForm } from './DietAnamnesisForm'
import { DietEditor } from './DietEditor'
import { FoodPicker } from './FoodPicker'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { todayKey } from '@/lib/date'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'

type Props = { mode: 'ia' | 'import'; onDone: () => void; onBack: () => void }
type Report = ReturnType<typeof dietFromFormat>['items'][number]
/** `info` = como cada item (pelo id) casou e o nome que a IA escreveu */
type Review = { plan: DietPlan; info: Record<string, Report>; offline: boolean }

const NO_FOODS: DietItem[] = []
const NO_LOG: DietLog = {}
const LETTERS = 'ABCD'
const allItems = (plan: DietPlan) => plan.menus.flatMap((m) => m.meals.flatMap((ml) => ml.options.flatMap((o) => o.items)))
const replaceItem = (plan: DietPlan, id: string, next: DietItem): DietPlan => ({
  ...plan,
  menus: plan.menus.map((m) => ({ ...m, meals: m.meals.map((ml) => ({ ...ml, options: ml.options.map((o) => ({ ...o, items: o.items.map((i) => (i.id === id ? next : i)) })) })) })),
})
const portionText = (i: DietItem) => (i.portion ? `${i.portion} · ${formatDec(i.grams)} g` : `${formatDec(i.grams)} g`)

export function DietImport({ mode, onDone, onBack }: Props) {
  const [profile, setProfile, profileLoaded] = usePersisted('profile', NO_PROFILE)
  const [saved, setPlan, planLoaded] = usePersisted('dietPlan', EMPTY_DIET)
  const [, setLog, logLoaded] = usePersisted('dietLog', NO_LOG)
  const [foods, , foodsLoaded] = usePersisted('foods', NO_FOODS)
  const [edited, setEdited] = useState<Partial<DietAnamnesis>>()
  const [text, setText] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [review, setReview] = useState<Review>()
  const [tab, setTab] = useState(0)
  const [picking, setPicking] = useState<DietItem>()
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const instant = useRef(false) // arquivo escolhido revisa na hora; digitar espera 400 ms
  // até a pessoa mexer, a anamnese é a do perfil (só aparece depois do perfil carregar)
  const anamnesis = edited ?? profile.dietAnamnesis ?? {}

  const copyPrompt = async () => {
    const dietAnamnesis = anamnesis as DietAnamnesis
    setProfile((p) => ({ ...p, dietAnamnesis }))
    try {
      await navigator.clipboard.writeText(buildDietPrompt({ ...profile, dietAnamnesis }))
      toast('Prompt copiado')
    } catch {
      toast('Não consegui copiar. Tente de novo.')
    }
  }

  const edit = (v: string) => {
    setText(v)
    setReview(undefined)
    setProblems([])
  }

  useEffect(() => {
    // em revisão, um alimento criado no FoodPicker muda `foods` e rever perderia as trocas
    if (!foodsLoaded || review || !text.trim()) return
    let stale = false
    const run = async () => {
      let file
      try {
        file = parseDietFormat(text)
      } catch (e) {
        if (!stale) setProblems(e instanceof PlanFormatError ? e.problems : ['Não encontrei um cardápio em JSON no texto'])
        return
      }
      const taco = await fetchTaco().catch(() => null)
      if (stale) return
      const r = dietFromFormat(file, taco, foods)
      const ids = allItems(r.plan)
      const info = Object.fromEntries(r.items.map((x, n) => [ids[n].id, x]))
      setTab(0)
      setReview({ plan: { menus: r.plan.menus.map((m) => ({ ...m, meals: sortedMeals(m.meals) })) }, info, offline: r.offline })
    }
    const t = setTimeout(() => void run(), instant.current ? 0 : 400)
    instant.current = false
    return () => { stale = true; clearTimeout(t) }
  }, [text, foodsLoaded, foods, review])

  const use = () => {
    if (!review) return
    const next: DietPlan = { menus: review.plan.menus, lastMenuId: review.plan.menus[0].id }
    setPlan(() => next)
    setLog((l) => ensureDay(l, next, todayKey()))
    onDone()
  }

  if (editing && review) return <DietEditor initial={review.plan} onDone={onDone} onCancel={() => setEditing(false)} />

  if (review) {
    const menu = review.plan.menus[tab] ?? review.plan.menus[0]
    const outside = allItems(review.plan).filter((i) => i.source === 'ia').length
    const label = (i: DietItem) => {
      const r = review.info[i.id]
      if (r?.match === 'none') return { text: 'sem valores — escolha na TACO', warn: true }
      if (i.source === 'ia' && i.per100.kcal > 0) return { text: 'estimativa da IA', warn: true }
      if (r?.match === 'words' && r.aiName !== i.name) return { text: `na TACO: ${i.name}`, warn: false }
    }
    return (
      <div className="flex flex-col gap-3 pb-28">
        <header className="flex min-h-11 items-center gap-3 py-2">
          <button type="button" className="icon-btn" aria-label="Voltar" onClick={() => edit('')}><ChevronLeft size={18} /></button>
          <h1 className="flex-1 text-[19px] font-semibold text-strong">Revisar cardápio</h1>
        </header>
        {review.offline && <p role="status" className="rounded-[14px] border border-border bg-panel p-3.5 text-[13px] text-text-2">Sem internet: usei os números da IA. Dá pra trocar depois.</p>}
        {review.plan.menus.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Cardápios">
            {review.plan.menus.map((m, n) => (
              <button key={m.id} type="button" className={cn('h-11 shrink-0 rounded-[10px] border px-3 text-[13px] whitespace-nowrap', m.id === menu.id ? 'border-accent bg-accent-bg text-accent' : 'border-border text-text')} aria-pressed={m.id === menu.id} onClick={() => setTab(n)}>
                {m.name}
              </button>
            ))}
          </div>
        )}
        {(menu.goalKcal !== undefined || menu.goalMacros) && (
          <div className="flex justify-between gap-3 rounded-[14px] border border-border bg-panel px-3.5 py-2.5 text-[13px] tabular-nums text-text-2">
            <span>{menu.goalKcal !== undefined ? `Meta · ${menu.goalKcal.toLocaleString('pt-BR')} kcal` : 'Meta'}</span>
            {menu.goalMacros && <span>{`P ${formatDec(menu.goalMacros.p)} · C ${formatDec(menu.goalMacros.c)} · G ${formatDec(menu.goalMacros.f)}`}</span>}
          </div>
        )}
        {menu.meals.map((meal) => (
          <section key={meal.id} aria-label={meal.name} className="overflow-hidden rounded-[14px] border border-border bg-panel">
            <div className="px-3.5 pt-3 pb-1">
              <div className="text-[15px] font-semibold text-strong">{meal.name}</div>
              <div className="text-[12.5px] text-text-2">{meal.time}</div>
            </div>
            {meal.options.map((o, oi) => (
              <div key={o.id} className="pb-1.5">
                {meal.options.length > 1 && (
                  <div className="px-3.5 pt-2 text-[10px] font-semibold tracking-[.04em] text-faint uppercase">
                    {`Opção ${LETTERS[oi]}${o.name ? ` · ${o.name}` : ''} · ${Math.round(o.items.reduce((s, i) => s + itemKcal(i), 0))} kcal`}
                  </div>
                )}
                {o.items.map((i) => {
                  const l = label(i)
                  const shown = review.info[i.id]?.match === 'words' ? review.info[i.id].aiName : i.name
                  const body = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-strong">{shown}</span>
                        <span className="block text-[12.5px] text-text-2">{portionText(i)}</span>
                        {l && <span className={cn('block text-[12px]', l.warn ? 'text-c7' : 'text-faint')}>{l.text}</span>}
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-text-2">{`${Math.round(itemKcal(i))} kcal`}</span>
                    </>
                  )
                  return i.source === 'ia'
                    ? <button key={i.id} type="button" className="flex min-h-11 w-full items-center gap-3 px-3.5 py-1.5 text-left" onClick={() => setPicking(i)}>{body}</button>
                    : <div key={i.id} className="flex min-h-11 items-center gap-3 px-3.5 py-1.5">{body}</div>
                })}
              </div>
            ))}
          </section>
        ))}
        {outside > 0 && (
          <p className="flex items-start gap-2 rounded-[14px] border border-border bg-panel p-3.5 text-[13px] text-text-2">
            <AlertTriangle size={16} className="mt-px shrink-0 text-c7" aria-hidden="true" />
            {`${outside} ${outside === 1 ? 'item fora da TACO usa' : 'itens fora da TACO usam'} os números da IA. Toque pra trocar.`}
          </p>
        )}
        <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md gap-2 bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setEditing(true)}>Editar</Button>
          <Button type="button" className="flex-1" disabled={!planLoaded || !logLoaded} onClick={() => (saved.menus.length ? setConfirming(true) : use())}>Usar cardápios</Button>
        </div>
        {picking && (
          <FoodPicker
            title={`Trocar · ${picking.name}`}
            initialGrams={picking.grams}
            confirmLabel="Trocar"
            onPick={(next) => {
              setReview((r) => r && { ...r, plan: replaceItem(r.plan, picking.id, next) })
              setPicking(undefined)
            }}
            onClose={() => setPicking(undefined)}
          />
        )}
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Substituir cardápio?</AlertDialogTitle>
              <AlertDialogDescription>O cardápio atual será substituído. O que você já marcou hoje continua.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={use}>Substituir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-28">
      <header className="flex min-h-11 items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={onBack}><ChevronLeft size={18} /></button>
        <h1 className="flex-1 text-[19px] font-semibold text-strong">{mode === 'ia' ? 'Gerar com IA' : 'Importar cardápio'}</h1>
      </header>
      {mode === 'ia' && profileLoaded && <DietAnamnesisForm value={anamnesis} onChange={setEdited} />}
      <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
        {mode === 'ia' && <Step n={1} title="Copie o prompt" sub="Botão lá embaixo; cole no ChatGPT" />}
        <Step n={mode === 'ia' ? 2 : 1} title="Cole a resposta aqui" sub="Pode colar o texto todo ou escolher o arquivo" />
      </div>
      <textarea
        aria-label="Resposta da IA"
        rows={8}
        className="w-full resize-none rounded-[14px] border border-border bg-panel p-3.5 text-base text-text outline-none placeholder:text-faint focus-visible:border-accent-line"
        placeholder='{ "formato": "pump-plano", "dieta": ... }'
        value={text}
        onChange={(e) => edit(e.target.value)}
      />
      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">
        <FileUp size={16} aria-hidden="true" />
        Escolher arquivo
        <input type="file" hidden accept=".json,application/json,text/plain" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) { const t = await f.text(); instant.current = t !== text; edit(t) }
          e.target.value = ''
        }} />
      </label>
      {problems.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-[14px] border border-border bg-panel p-3.5 text-[13px] text-negative">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {mode === 'ia' && (
        <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" className="w-full" disabled={!profileLoaded || !anamnesis.goal} onClick={copyPrompt}><Copy size={16} aria-hidden="true" />Copiar prompt pra IA</Button>
        </div>
      )}
    </div>
  )
}
