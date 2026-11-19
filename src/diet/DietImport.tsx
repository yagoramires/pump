import { useState } from 'react'
import { AlertTriangle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { DietAnamnesis, DietItem, DietPlan } from './types'
import { usePersisted } from '@/storage/db'
import { fetchTaco } from '@/catalog/catalog'
import { buildDietConvertPrompt, buildDietPrompt } from './prompt'
import { DIET_NOT_FOUND, dietFromFormat, matchLabel, parseDietFormat } from './dietFormat'
import { optionLetter } from './day'
import { itemKcal, kcalOf, macroText, portionText } from './food'
import { savePlan } from './plan'
import { DietAnamnesisForm } from './DietAnamnesisForm'
import { DietEditor } from './DietEditor'
import { FoodPicker } from './FoodPicker'
import { CopyListButton, PasteBox, Step } from '@/components/ImportFlow'
import { usePastedReview } from '@/components/usePastedReview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDec } from '@/lib/number'
import { namesText } from '@/lib/text'
import { todayKey } from '@/lib/date'
import { copyText } from '@/lib/share'
import { cn } from '@/lib/utils'

type Props = { mode: 'ia' | 'convert'; onDone: () => void; onBack: () => void }

const allItems = (plan: DietPlan) => plan.menus.flatMap((m) => m.meals.flatMap((ml) => ml.options.flatMap((o) => o.items)))
const replaceItem = (plan: DietPlan, id: string, next: DietItem): DietPlan => ({
  ...plan,
  menus: plan.menus.map((m) => ({ ...m, meals: m.meals.map((ml) => ({ ...ml, options: ml.options.map((o) => ({ ...o, items: o.items.map((i) => (i.id === id ? next : i)) })) })) })),
})

export function DietImport({ mode, onDone, onBack }: Props) {
  const [profile, setProfile] = usePersisted('profile')
  const [saved, setPlan] = usePersisted('dietPlan')
  const [foods] = usePersisted('foods')
  const [measurements] = usePersisted('measurements')
  const [edited, setEdited] = useState<DietAnamnesis>()
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

  const copy = async (text: string, ok = 'Prompt copiado') => toast((await copyText(text)) ? ok : 'Não consegui copiar. Tente de novo.')
  const copyPrompt = () => {
    setProfile((p) => ({ ...p, dietAnamnesis: anamnesis }))
    return copy(buildDietPrompt({ ...profile, dietAnamnesis: anamnesis }, measurements, todayKey()))
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
    const outsideNames = [...new Set(allItems(review.plan).filter((i) => i.source === 'ia').map((i) => i.name))]
    const outside = outsideNames.length
    return (
      <div className="flex flex-col gap-3 pb-28">
        <BackHeader title="Revisar cardápio" onBack={() => edit('')} className="min-h-11" />
        {review.offline && <Card role="status" className="p-3.5 text-[13px] text-text-2">Sem internet: usei os números da IA. Dá pra trocar depois.</Card>}
        {review.plan.menus.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Cardápios">
            {review.plan.menus.map((m, n) => (
              <Toggle key={m.id} variant="outline" className="h-11 shrink-0 rounded-xl px-3 text-[13px]" pressed={m.id === menu.id} onPressedChange={() => setTab(n)}>
                {m.name}
              </Toggle>
            ))}
          </div>
        )}
        {(menu.goalKcal !== undefined || menu.goalMacros) && (
          <Card className="flex-row justify-between gap-3 p-3.5 text-[13px] tabular-nums text-text-2">
            <span>{menu.goalKcal !== undefined ? `Meta · ${formatDec(menu.goalKcal)} kcal` : 'Meta'}</span>
            {menu.goalMacros && <span>{macroText(menu.goalMacros)}</span>}
          </Card>
        )}
        {menu.meals.map((meal) => (
          <Card key={meal.id} role="region" aria-label={meal.name} className="overflow-hidden">
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
                    ? <Button key={i.id} variant="ghost" className="h-auto min-h-11 w-full justify-start gap-3 rounded-none px-3.5 py-1.5 text-left font-normal" onClick={() => setPicking(i)}>{body}</Button>
                    : <div key={i.id} className="flex min-h-11 items-center gap-3 px-3.5 py-1.5">{body}</div>
                })}
              </div>
            ))}
          </Card>
        ))}
        {outside > 0 && (
          <Card className="flex-row items-start gap-2 p-3.5 text-[13px] text-text-2">
            <AlertTriangle size={16} className="mt-px shrink-0 text-c7" aria-hidden="true" />
            <span>
              {`${outside} ${outside === 1 ? 'item fora da TACO usa' : 'itens fora da TACO usam'} os números da IA. Toque pra trocar.`}
              <span className="block">{namesText(outsideNames)}</span>
            </span>
          </Card>
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
      <BackHeader title={mode === 'ia' ? 'Gerar com IA' : 'Converter dieta'} onBack={onBack} className="min-h-11" />
      {mode === 'ia' && <DietAnamnesisForm value={anamnesis} onChange={setEdited} />}
      <div className="overflow-hidden card">
        {mode === 'ia'
          ? <Step n={1} title="Copie o prompt" sub="Botão lá embaixo; cole no ChatGPT" />
          : (
            <Step n={1} title="Copie o prompt" sub="Cole no ChatGPT">
              <Button type="button" variant="outline" size="sm" className="h-9 bg-transparent" onClick={() => copy(buildDietConvertPrompt())}><Copy size={14} aria-hidden="true" />Copiar</Button>
            </Step>
          )}
        {mode === 'convert' && <Step n={2} title="Mande pra sua IA junto com sua dieta" sub="PDF, foto ou texto" />}
        <Step n={mode === 'ia' ? 2 : 3} title="Cole a resposta aqui" sub="Pode colar o texto todo ou escolher o arquivo" />
      </div>
      <CopyListButton file="alimentos.txt" noun="alimentos" copy={(t) => copy(t, 'Lista copiada')} fail={toast} />
      <PasteBox text={paste.text} onText={edit} onFile={(t) => edit(t, true)} problems={paste.problems} placeholder='{ "formato": "pump-plano", "dieta": ... }'>
        {paste.reviewing && <p role="status" className="text-[13px] text-text-2">Conferindo na TACO…</p>}
      </PasteBox>
      {mode === 'ia' && (
        <BottomBar>
          <Button type="button" className="w-full" onClick={copyPrompt}><Copy size={16} aria-hidden="true" />Copiar prompt pra IA</Button>
        </BottomBar>
      )}
    </div>
  )
}
