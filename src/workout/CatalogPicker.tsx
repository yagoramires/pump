import { useMemo, useState } from 'react'
import { Dumbbell, Plus } from 'lucide-react'
import type { CustomExercise, Exercise } from './types'
import { usePersisted } from '@/storage/db'
import { fetchExercises, imageUrl } from '@/catalog/catalog'
import { searchByName } from '@/catalog/search'
import { MUSCLE_GROUPS, muscleColor } from '@/catalog/muscles'
import { useCatalog } from '@/catalog/useCatalog'
import { isCustom, newCustomExercise } from './exercises'
import { IconDot } from '@/components/IconDot'
import { BackHeader } from '@/components/BackHeader'
import { SearchField } from '@/components/SearchField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MUSCLES = [...MUSCLE_GROUPS.keys()]

const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'pt-BR'))

function Chips({ values, value, onChange, label }: { values: string[]; value?: string; onChange: (v?: string) => void; label: string }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={label}>
      {values.map((v) => (
        <Toggle key={v} variant="outline" className="shrink-0 text-[13px]" pressed={value === v} onPressedChange={() => onChange(value === v ? undefined : v)}>
          {v}
        </Toggle>
      ))}
    </div>
  )
}

function Row({ e, mine, onPick }: { e: Exercise | CustomExercise; mine?: boolean; onPick: () => void }) {
  const img = isCustom(e) ? undefined : e.images[0]
  return (
    <li className="flex items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
      {img ? <img src={imageUrl(img)} alt="" loading="lazy" className="size-10 shrink-0 rounded-[10px] bg-surface object-cover" /> : <IconDot color={muscleColor(e.muscles)} size={36}><Dumbbell size={16} /></IconDot>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-strong">{e.name}</span>
        <span className="block truncate text-[12.5px] text-text-2">{e.muscles.join(', ')}{mine ? ' · seu exercício' : ''}</span>
      </span>
      <Button variant="ghost" size="icon" className="text-accent" aria-label={`Adicionar ${e.name}`} onClick={onPick}><Plus /></Button>
    </li>
  )
}

const LABEL = 'label-caps px-4 pt-3 pb-1 tracking-[.04em]'

export function CatalogPicker({ onPick, onClose }: { onPick: (e: Exercise | CustomExercise) => void; onClose: () => void }) {
  const { list: catalog, offline } = useCatalog(fetchExercises)
  const [custom, setCustom] = usePersisted('customExercises')
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string>()
  const [equipment, setEquipment] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', muscle: MUSCLES[0], note: '' })

  const muscles = useMemo(() => uniq(catalog.flatMap((e) => e.muscles)), [catalog])
  const equipments = useMemo(() => uniq(catalog.map((e) => e.equipment).filter(Boolean)), [catalog])
  const byMuscle = (e: Exercise | CustomExercise) => !muscle || e.muscles.includes(muscle)
  const shownMine = equipment ? [] : searchByName(custom.filter(byMuscle), q) // exercício próprio não tem aparelho
  const list = searchByName(catalog.filter((e) => byMuscle(e) && (!equipment || e.equipment === equipment)), q).slice(0, 100)

  const create = () => {
    const name = draft.name.trim()
    if (!name) return
    const e = newCustomExercise(name, [draft.muscle], draft.note.trim())
    setCustom((prev) => [...prev, e])
    onPick(e)
  }

  return (
    <div className="fixed inset-0 z-(--z-sheet) flex flex-col bg-bg" role="dialog" aria-label="Escolher exercício">
      <BackHeader title="Exercícios" onBack={onClose} className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2" />
      <SearchField className="mx-4 mb-2" placeholder={`Buscar entre ${catalog.length + custom.length}…`} aria-label="Buscar exercício" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <Chips label="Músculo" values={muscles} value={muscle} onChange={setMuscle} />
        <Chips label="Aparelho" values={equipments} value={equipment} onChange={setEquipment} />
      </div>
      {offline && <p className="px-4 pt-2 text-[13px] text-text-2">Sem internet: só seus exercícios aparecem</p>}
      <div className="flex-1 overflow-y-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shownMine.length > 0 && (
          <>
            <h2 className={LABEL}>Seus exercícios</h2>
            <Card className="mx-4 overflow-hidden"><ul>{shownMine.map((e) => <Row key={e.id} e={e} mine onPick={() => onPick(e)} />)}</ul></Card>
          </>
        )}
        {list.length > 0 && (
          <>
            <h2 className={LABEL}>Catálogo</h2>
            <Card className="mx-4 overflow-hidden"><ul>{list.map((e) => <Row key={e.id} e={e} onPick={() => onPick(e)} />)}</ul></Card>
          </>
        )}
      </div>
      <div className="border-t border-line bg-bg px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <Button variant="outline" className="w-full" onClick={() => setCreating(true)}><Plus /> Criar exercício próprio</Button>
      </div>
      <Drawer open={creating} onOpenChange={setCreating}>
        <DrawerContent>
          <form className="flex flex-col gap-3 px-4 pb-5" onSubmit={(e) => { e.preventDefault(); create() }}>
            <DrawerTitle className="text-[19px] font-semibold text-strong">Exercício próprio</DrawerTitle>
            <DrawerDescription className="sr-only">Crie um exercício e adicione ao treino</DrawerDescription>
            <Input aria-label="Nome do exercício" placeholder="Nome" autoComplete="off" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Select value={draft.muscle} onValueChange={(muscle) => setDraft({ ...draft, muscle })}>
              <SelectTrigger aria-label="Grupo muscular"><SelectValue /></SelectTrigger>
              <SelectContent>{MUSCLES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input aria-label="Observação" placeholder="Observação (opcional)" autoComplete="off" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={!draft.name.trim()}>Criar e adicionar</Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
