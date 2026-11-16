import { useEffect, useMemo, useState } from 'react'
import { Dumbbell, Plus, X } from 'lucide-react'
import type { CustomExercise, Exercise } from '../types'
import { usePersisted } from '../storage/db'
import { fetchCatalog, imageUrl } from './catalog'
import { searchCatalog } from './search'

// valores de `muscles` do glossário pt-BR (data/glossary.pt.json)
const MUSCLES = [
  'abdominais', 'abdutores', 'adutores', 'bíceps', 'panturrilhas', 'peito', 'antebraços', 'glúteos', 'posteriores de coxa',
  'dorsais', 'lombar', 'meio das costas', 'pescoço', 'quadríceps', 'ombros', 'trapézio', 'tríceps',
]

const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'pt-BR'))

function Chips({ values, value, onChange, label }: { values: string[]; value?: string; onChange: (v?: string) => void; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {values.map((v) => (
        <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => onChange(value === v ? undefined : v)}>
          {v}
        </button>
      ))}
    </div>
  )
}

export function CatalogPicker({ onPick, onClose }: { onPick: (e: Exercise | CustomExercise) => void; onClose: () => void }) {
  const [catalog, setCatalog] = useState<Exercise[]>([])
  const [offline, setOffline] = useState(false)
  const [custom, setCustom] = usePersisted('customExercises', [])
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string>()
  const [equipment, setEquipment] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', muscle: MUSCLES[0], note: '' })

  useEffect(() => {
    fetchCatalog().then(setCatalog, () => setOffline(true))
  }, [])

  const muscles = useMemo(() => uniq(catalog.flatMap((e) => e.muscles)), [catalog])
  const equipments = useMemo(() => uniq(catalog.map((e) => e.equipment).filter(Boolean)), [catalog])
  const filter = { muscle, equipment }
  const mine = searchCatalog(custom, q, { muscle })
  const shownMine = equipment ? [] : mine // exercício próprio não tem aparelho
  const list = searchCatalog(catalog, q, filter).slice(0, 100)

  const create = () => {
    const name = draft.name.trim()
    if (!name) return
    const e: CustomExercise = { id: `custom-${crypto.randomUUID()}`, name, muscles: [draft.muscle], ...(draft.note.trim() && { note: draft.note.trim() }) }
    setCustom((prev) => [...prev, e])
    onPick(e)
  }

  return (
    <div className="picker" role="dialog" aria-label="Escolher exercício">
      <header className="picker-head">
        <input autoFocus type="search" className="field" placeholder="Buscar exercício" aria-label="Buscar exercício" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {offline && <p className="muted-note">Sem internet: só seus exercícios aparecem</p>}
      <Chips label="Músculo" values={muscles} value={muscle} onChange={setMuscle} />
      <Chips label="Aparelho" values={equipments} value={equipment} onChange={setEquipment} />
      {creating ? (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); create() }}>
          <input className="field" aria-label="Nome do exercício" placeholder="Nome" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="field" aria-label="Grupo muscular" value={draft.muscle} onChange={(e) => setDraft({ ...draft, muscle: e.target.value })}>
            {MUSCLES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input className="field" aria-label="Observação" placeholder="Observação (opcional)" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <div className="row-actions">
            <button type="button" className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="btn" disabled={!draft.name.trim()}>Criar e adicionar</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn ghost" onClick={() => setCreating(true)}>
          <Plus size={18} /> Criar exercício
        </button>
      )}
      <ul className="ex-list">
        {shownMine.map((e) => (
          <li key={e.id}>
            <button type="button" className="ex-row" onClick={() => onPick(e)}>
              <span className="thumb"><Dumbbell size={18} /></span>
              <span className="grow"><span className="name">{e.name}</span><span className="muted">{e.muscles.join(', ')} · seu exercício</span></span>
            </button>
          </li>
        ))}
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" className="ex-row" onClick={() => onPick(e)}>
              <span className="thumb">
                {e.images[0] ? <img src={imageUrl(e.images[0])} alt="" loading="lazy" /> : <Dumbbell size={18} />}
              </span>
              <span className="grow"><span className="name">{e.name}</span><span className="muted">{e.muscles.join(', ')}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
