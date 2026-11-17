import { useState } from 'react'
import type { Anamnesis, Goal, Level, Place } from '../types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const LABEL = 'mb-1.5 block text-[10px] font-semibold tracking-[0.08em] text-faint uppercase'
const DAYS = ['1', '2', '3', '4', '5', '6', '7']
const GOAL_LABEL: Record<Goal, string> = { hipertrofia: 'Ganhar massa', emagrecer: 'Emagrecer', forca: 'Força', saude: 'Saúde' }
const LEVEL_LABEL: Record<Level, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
const PLACE_LABEL: Record<Place, string> = { academia: 'Academia', casa: 'Em casa' }

function Chips<T extends string>({ label, options, value, onChange, cols }: { label: string; options: Record<T, string>; value?: T; onChange: (v?: T) => void; cols?: string }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <ToggleGroup type="single" spacing={1} aria-label={label} value={value ?? ''} onValueChange={(v) => onChange((v || undefined) as T | undefined)} className={cn('grid w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]', cols ?? 'grid-flow-col auto-cols-fr')}>
        {(Object.keys(options) as T[]).map((k) => (
          <ToggleGroupItem key={k} value={k} className="h-9 rounded-[8px] px-1 text-[13px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]">{options[k]}</ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

const toInt = (v: string) => parseInt(v, 10) || undefined

// estado local: o valor persistido só volta depois do IndexedDB gravar e perderia letras digitadas rápido
export function AnamnesisForm({ initial, onChange }: { initial: Anamnesis; onChange: (a: Anamnesis) => void }) {
  const [value, setValue] = useState(initial)
  const set = <K extends keyof Anamnesis>(k: K, v: Anamnesis[K]) => {
    const next = { ...value, [k]: v }
    setValue(next)
    onChange(next)
  }
  return (
    <section aria-labelledby="anamnese" className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-panel p-3.5">
      <div>
        <h2 id="anamnese" className="text-[15px] font-semibold text-strong">Sobre seu treino</h2>
        <p className="text-[13px] text-text-2">Opcional. Vai junto no prompt com seu perfil; o que faltar a IA pergunta.</p>
      </div>
      <Chips label="Objetivo" options={GOAL_LABEL} value={value.goal} onChange={(v) => set('goal', v)} cols="grid-cols-2" />
      <Chips label="Nível" options={LEVEL_LABEL} value={value.level} onChange={(v) => set('level', v)} />
      <Chips label="Onde treina" options={PLACE_LABEL} value={value.place} onChange={(v) => set('place', v)} />
      <Chips label="Dias por semana" options={Object.fromEntries(DAYS.map((d) => [d, d]))} value={value.daysPerWeek ? String(value.daysPerWeek) : undefined} onChange={(v) => set('daysPerWeek', v ? Number(v) : undefined)} />
      <div className="grid grid-cols-2 gap-3">
        {([['idade', 'Idade', 'anos', 'age'], ['tempo', 'Tempo por treino', 'min', 'minutes']] as const).map(([id, label, unit, k]) => (
          <div key={id}>
            <label htmlFor={id} className={LABEL}>{label}</label>
            <div className="relative">
              <Input id={id} className="pr-12" inputMode="numeric" value={value[k] ?? ''} onChange={(e) => set(k, toInt(e.target.value))} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-faint">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="limitacoes" className={LABEL}>Lesões, limitações ou preferências</label>
        <textarea
          id="limitacoes"
          rows={2}
          className="w-full resize-none rounded-[11px] border border-border bg-surface p-3 text-base text-text outline-none placeholder:text-faint focus-visible:border-accent-line"
          placeholder="Ex.: dor no ombro direito, não gosto de agachamento livre"
          value={value.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || undefined)}
        />
      </div>
    </section>
  )
}
