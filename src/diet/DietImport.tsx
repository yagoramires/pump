import { useState } from 'react'
import { AlertTriangle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { DietAnamnesis, DietItem, DietPlan } from './types'
import { usePersisted } from '@/storage/db'
import { fetchTaco } from '@/catalog/catalog'
import { buildDietPrompt } from './prompt'
import { DIET_NOT_FOUND, dietFromFormat, matchLabel, parseDietFormat } from './dietFormat'
import { optionLetter } from './day'
import { itemKcal, kcalOf, macroText, portionText } from './food'
import { savePlan } from './plan'
import { DietAnamnesisForm } from './DietAnamnesisForm'
import { DietEditor } from './DietEditor'
import { FoodPicker } from './FoodPicker'
import { PasteBox, Step } from '@/components/ImportFlow'
import { usePastedReview } from '@/components/usePastedReview'
import { Button } from '@/components/ui/button'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDec } from '@/lib/number'
import { copyText } from '@/lib/share'
import { cn } from '@/lib/utils'

type Props = { mode: 'ia' | 'import'; onDone: () => void; onBack: () => void }

const allItems = (plan: DietPlan) => plan.menus.flatMap((m) => m.meals.flatMap((ml) => ml.options.flatMap((o) => o.items)))
const replaceItem = (plan: DietPlan, id: string, next: DietItem): DietPlan => ({
  ...plan,
  menus: plan.menus.map((m) => ({ ...m, meals: m.meals.map((ml) => ({ ...ml, options: ml.options.map((o) => ({ ...o, items: o.items.map((i) => (i.id === id ? next : i)) })) })) })),
})

export function DietImport({ mode, onDone, onBack }: Props) {
  const [profile, setProfile] = usePersisted('profile')
  const [saved, setPlan] = usePersisted('dietPlan')
  const [foods] = usePersisted('foods')
  const [edited, setEdited] = useState<Partial<DietAnamnesis>>()
  const [tab, setTab] = useState(0)
  const [picking, setPicking] = useState<DietItem>()
  const [replacing, setReplacing] = useState<DietPlan>()
  const [editing, setEditing] = useState(false)
  const paste = usePastedReview(parseDietFormat, async (file) => {
    const r = dietFromFormat(file, await fetchTaco().catch(() => null), foods)
    return { ...r, plan: savePlan(saved, r.plan) }
  }, DIET_NOT_FOUND)
  const review = paste.result
  const anamnesis = edited ?? profile.dietAnamnesis ?? {}

  const copyPrompt = async () => {
    const { goal } = anamnesis
    if (!goal) return
    const dietAnamnesis = { ...anamnesis, goal }
    setProfile((p) => ({ ...p, dietAnamnesis }))
    toast((await copyText(buildDietPrompt({ ...profile, dietAnamnesis }))) ? 'Prompt copiado' : 'Não consegui copiar. Tente de novo.')
  }
  const edit = (v: string, now?: boolean) => {
    setTab(0)
    paste.set(v, now)
  }

  const commit = (next: DietPlan) => {
    setPlan((p) => savePlan(p, next))
    onDone()
  }
  const offer = (next: DietPlan) => (saved.menus.length && next.menus.length ? setReplacing(next) : commit(next))

  const confirm = (
    <ConfirmDialog
      open={!!replacing} title="Substituir cardápio?" text="O cardápio atual será substituído. O que você já marcou hoje continua." confirm="Substituir"
      onConfirm={() => replacing && commit(replacing)} onCancel={() => setReplacing(undefined)}
    />
  )

  if (editing && review) return <><DietEditor initial={review.plan} onSave={offer} onCancel={() => setEditing(false)} />{confirm}</>

  if (review) {
    const menu = review.plan.menus[tab] ?? review.plan.menus[0]
    const outside = allItems(review.plan).filter((i) => i.source === 'ia').length
    return (
      <div className="flex flex-col gap-3 pb-28">
        <BackHeader title="Revisar cardápio" onBack={() => edit('')} className="min-h-11" />
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
            <span>{menu.goalKcal !== undefined ? `Meta · ${formatDec(menu.goalKcal)} kcal` : 'Meta'}</span>
            {menu.goalMacros && <span>{macroText(menu.goalMacros)}</span>}
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
                  <div className="label-caps px-3.5 pt-2 tracking-[.04em]">
                    {`Opção ${optionLetter(oi)}${o.name ? ` · ${o.name}` : ''} · ${kcalOf(o.items)} kcal`}
                  </div>
                )}
                {o.items.map((i) => {
                  const r = review.reports[i.id]
                  const l = matchLabel(i, r)
                  const shown = r?.match === 'words' ? r.aiName : i.name
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
        <BottomBar className="gap-2">
          <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setEditing(true)}>Editar</Button>
          <Button type="button" className="flex-1" onClick={() => offer(review.plan)}>Usar cardápios</Button>
        </BottomBar>
        {picking && (
          <FoodPicker
            title={`Trocar · ${picking.name}`}
            initialGrams={picking.grams}
            confirmLabel="Trocar"
            onPick={(next) => {
              paste.setResult((r) => r && { ...r, plan: replaceItem(r.plan, picking.id, next) })
              setPicking(undefined)
            }}
            onClose={() => setPicking(undefined)}
          />
        )}
        {confirm}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-28">
      <BackHeader title={mode === 'ia' ? 'Gerar com IA' : 'Importar cardápio'} onBack={onBack} className="min-h-11" />
      {mode === 'ia' && <DietAnamnesisForm value={anamnesis} onChange={setEdited} />}
      <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
        {mode === 'ia' && <Step n={1} title="Copie o prompt" sub="Botão lá embaixo; cole no ChatGPT" />}
        <Step n={mode === 'ia' ? 2 : 1} title="Cole a resposta aqui" sub="Pode colar o texto todo ou escolher o arquivo" />
      </div>
      <PasteBox text={paste.text} onText={edit} onFile={(t) => edit(t, true)} problems={paste.problems} placeholder='{ "formato": "pump-plano", "dieta": ... }'>
        {paste.reviewing && <p role="status" className="text-[13px] text-text-2">Conferindo na TACO…</p>}
      </PasteBox>
      {mode === 'ia' && (
        <BottomBar>
          <Button type="button" className="w-full" disabled={!anamnesis.goal} onClick={copyPrompt}><Copy size={16} aria-hidden="true" />Copiar prompt pra IA</Button>
        </BottomBar>
      )}
    </div>
  )
}
