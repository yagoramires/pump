import { useState } from 'react'
import type { DietItem, DietPlan } from './types'
import { usePersisted } from '@/storage/db'
import { catalogOrNull, fetchTaco } from '@/catalog/catalog'
import { FOOD_LIST } from '@/catalog/urls'
import { HEADER } from '@/format/envelope'
import { buildDietConvertPrompt, buildDietPrompt } from './prompt'
import { dietFromFormat, parseDietFormat, type ItemReport } from './dietFormat'
import { iaLabel, itemKcalText, macroText, optionLabel, portionText } from './display'
import { mapItems, planItems, preparePlan } from './plan'
import { foodKey, hasValues, kcalOf } from './food'
import { useDietPlan } from './useDietPlan'
import { DietAnamnesisForm } from './DietAnamnesisForm'
import { DietEditor } from './DietEditor'
import { FoodPicker } from './FoodPicker'
import { CopyListButton, ImportGuide, OutsideCatalog, PasteBox, ReviewActions, ReviewTabs, type ImportMode } from '@/import/ImportFlow'
import { useReplaceConfirm } from '@/import/useReplaceConfirm'
import { usePastedReview } from '@/import/usePastedReview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BackHeader } from '@/components/BackHeader'
import { formatDec, plural } from '@/lib/number'
import { todayKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'

type Props = { mode: ImportMode; onDone: () => void; onBack: () => void }

const itemLines = (i: DietItem, r?: ItemReport): { shown: string; note?: string; warn?: boolean } => {
  const shown = r?.match === 'words' ? r.aiName : i.name
  if (r?.match === 'none') return { shown, note: 'sem valores — escolha na TACO', warn: true }
  const estimate = iaLabel(i)
  if (estimate && hasValues(i)) return { shown, note: estimate, warn: true }
  if (shown !== i.name) return { shown, note: `na TACO: ${i.name}` }
  return { shown }
}

export function DietImport({ mode, onDone, onBack }: Props) {
  const [profile, setProfile] = usePersisted('profile')
  const { plan: saved, replacePlan } = useDietPlan()
  const [foods] = usePersisted('foods')
  const [measurements] = usePersisted('measurements')
  const [picking, setPicking] = useState<DietItem>()
  const [editing, setEditing] = useState(false)
  const paste = usePastedReview(parseDietFormat, async (file) => {
    const review = dietFromFormat(file, await catalogOrNull(fetchTaco()), foods)
    return { ...review, plan: preparePlan(review.plan) }
  })
  const review = paste.result

  const commit = (next: DietPlan) => {
    replacePlan(next)
    onDone()
  }
  const { offer, dialog: confirm } = useReplaceConfirm(
    (next: DietPlan) => saved.menus.length > 0 && next.menus.length > 0, commit,
    'Substituir cardápio?', 'O cardápio atual será substituído. O que você já marcou hoje continua.',
  )

  if (editing && review) return <><DietEditor draft={review.plan} onDone={offer} onCancel={() => setEditing(false)} />{confirm}</>

  if (review) {
    const menu = review.plan.menus[paste.tab] ?? review.plan.menus[0]
    const originalNames = new Map<string, string>()
    for (const item of planItems(review.plan)) {
      const key = foodKey(item.name)
      if (item.source === 'ia' && !originalNames.has(key)) originalNames.set(key, item.name)
    }
    const outside = [...originalNames.values()]
    return (
      <div className="flex flex-col gap-3 pb-28">
        <BackHeader title="Revisar cardápio" onBack={() => paste.set('')} className="min-h-11" />
        {review.offline && <Alert role="status">Sem internet: usei os números da IA. Dá pra trocar depois.</Alert>}
        <ReviewTabs label="Cardápios" items={review.plan.menus} current={menu.id} onPick={paste.setTab} />
        {(menu.goalKcal !== undefined || menu.goalMacros) && (
          <Card className="flex-row justify-between gap-3 text-meta tabular-nums text-text-2">
            <span>{menu.goalKcal !== undefined ? `Meta · ${formatDec(menu.goalKcal)} kcal` : 'Meta'}</span>
            {menu.goalMacros && <span>{macroText(menu.goalMacros)}</span>}
          </Card>
        )}
        {menu.meals.map((meal) => (
          <Card size="flush" key={meal.id} role="region" aria-label={meal.name}>
            <div className="px-3.5 pt-3 pb-1">
              <div className="text-body font-semibold text-strong">{meal.name}</div>
              <div className="text-caption text-text-2">{meal.time}</div>
            </div>
            {meal.options.map((o, oi) => (
              <div key={o.id} className="pb-1.5">
                {meal.options.length > 1 && (
                  <div className="label-caps px-3.5 pt-2">
                    {`${optionLabel(oi, o.name)} · ${kcalOf(o.items)} kcal`}
                  </div>
                )}
                {o.items.map((i) => {
                  const { shown, note, warn } = itemLines(i, review.reports[i.id])
                  const body = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body text-strong">{shown}</span>
                        <span className="block text-caption text-text-2">{portionText(i)}</span>
                        {note && <span className={cn('block text-caption', warn ? 'text-c7' : 'text-faint')}>{note}</span>}
                      </span>
                      <span className="shrink-0 text-meta tabular-nums text-text-2">{itemKcalText(i)}</span>
                    </>
                  )
                  return i.source === 'ia'
                    ? <Button key={i.id} variant="ghost" className="h-auto min-h-11 w-full justify-start gap-3 rounded-none px-3.5 py-1.5 text-left font-normal whitespace-normal" onClick={() => setPicking(i)}>{body}</Button>
                    : <div key={i.id} className="flex min-h-11 items-center gap-3 px-3.5 py-1.5">{body}</div>
                })}
              </div>
            ))}
          </Card>
        ))}
        <OutsideCatalog title={`${plural(outside.length, 'item fora da TACO usa', 'itens fora da TACO usam')} os números da IA. Toque pra trocar.`} names={outside} />
        <ReviewActions ignored={review.ignoredWorkouts ? 'treinos' : undefined} use="Usar cardápios" onEdit={() => setEditing(true)} onUse={() => offer(review.plan)} />
        {picking && (
          <FoodPicker
            title={`Trocar · ${picking.name}`}
            initialGrams={picking.grams}
            confirmLabel="Trocar"
            onPick={(next) => {
              paste.setResult((r) => r && { ...r, plan: mapItems(r.plan, (i) => (i.id === picking.id ? next : i)) })
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
    <div className="flex flex-col gap-3">
      <BackHeader title={mode === 'ia' ? 'Gerar com IA' : 'Converter dieta'} onBack={onBack} className="min-h-11" />
      <ImportGuide
        mode={mode}
        made="cardápio"
        source="dieta"
        prompt={() => (mode === 'ia' ? buildDietPrompt(profile, measurements, todayKey()) : buildDietConvertPrompt())}
      >
        {mode === 'ia' && <DietAnamnesisForm value={profile.dietAnamnesis ?? {}} onChange={(dietAnamnesis) => setProfile((p) => ({ ...p, dietAnamnesis }))} />}
      </ImportGuide>
      <CopyListButton file={FOOD_LIST} noun="alimentos" />
      <PasteBox text={paste.text} onText={paste.set} onFile={(t) => paste.set(t, true)} problems={paste.problems} placeholder={`{ "formato": "${HEADER.formato}", "dieta": ... }`}>
        {paste.failed && <Alert variant="destructive">Não consegui revisar o cardápio. Tente colar ou escolher o arquivo novamente.</Alert>}
        {paste.reviewing && <p role="status" className="text-meta text-text-2">Conferindo na TACO…</p>}
      </PasteBox>
    </div>
  )
}
