import { useId, useState } from 'react'
import { Pill, Plus } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { FieldLabel } from '@/components/FieldLabel'
import { SettingsRow, type OpenView } from '@/components/SettingsSection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Supplement } from './types'
import { supplementSub } from './supplements'
import { useSupplements } from './useSupplements'

export function SupplementSettings({ open }: { open: OpenView }) {
  const { list } = useSupplements()
  const edit = (initial?: Supplement) => open(<SupplementForm initial={initial} onDone={() => open(<SupplementSettings open={open} />)} />)
  return (
    <div className="flex flex-col gap-3">
      <BackHeader title="Suplementos" onBack={() => open()} />
      {!!list.length && (
        <Card size="flush">
          {list.map((s) => (
            <SettingsRow key={s.id} icon={<Pill size={18} aria-hidden="true" />} color="var(--c4)" title={s.name} sub={supplementSub(s) || undefined} onClick={() => edit(s)} />
          ))}
        </Card>
      )}
      <Button variant="ghost" className="text-accent" onClick={() => edit()}><Plus aria-hidden="true" />Adicionar suplemento</Button>
      <p className="text-meta text-text-2">Os suplementos aparecem na aba Dieta pra marcar todo dia. O whey fica no cardápio.</p>
    </div>
  )
}

function SupplementForm({ initial, onDone }: { initial?: Supplement; onDone: () => void }) {
  const { list, save } = useSupplements()
  const [name, setName] = useState(initial?.name ?? '')
  const [dose, setDose] = useState(initial?.dose ?? '')
  const [when, setWhen] = useState(initial?.when ?? '')
  const id = useId()

  const submit = () => {
    const next: Supplement = { id: initial?.id ?? crypto.randomUUID(), name: name.trim(), ...(dose.trim() && { dose: dose.trim() }), ...(when.trim() && { when: when.trim() }) }
    save(initial ? list.map((s) => (s.id === initial.id ? next : s)) : [...list, next])
    onDone()
  }
  const remove = () => {
    save(list.filter((s) => s.id !== initial?.id))
    onDone()
  }

  const field = (key: string, label: string, value: string, set: (v: string) => void, optional?: boolean) => (
    <div className="flex flex-col gap-1.5">
      <FieldLabel label={label} optional={optional} htmlFor={`${id}-${key}`} />
      <Input id={`${id}-${key}`} value={value} autoComplete="off" onChange={(e) => set(e.target.value)} />
    </div>
  )

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) submit() }}>
      <BackHeader title={initial ? initial.name : 'Novo suplemento'} onBack={onDone} />
      {field('name', 'Nome', name, setName)}
      {field('dose', 'Dose', dose, setDose, true)}
      {field('when', 'Quando', when, setWhen, true)}
      <Button type="submit" disabled={!name.trim()}>Salvar</Button>
      {initial && <Button type="button" variant="destructive" onClick={remove}>Remover suplemento</Button>}
    </form>
  )
}
