import type { Profile } from './types'
import { NumberField } from '@/components/NumberField'
import { Chips } from '@/components/Chips'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const LABEL = 'label-caps mb-1.5 block tracking-[0.08em]'
const AREA = 'w-full resize-none rounded-[11px] border border-border bg-surface p-3 text-base text-text outline-none placeholder:text-faint focus-visible:border-accent-line'
const TIMES = [['wake', 'Acorda'], ['train', 'Treina'], ['sleep', 'Dorme']] as const
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

export function AboutForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup type="single" spacing={1} value={value.sex} onValueChange={(v) => v && set('sex', v as Profile['sex'])} aria-label="Sexo" className="w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]">
        {(['M', 'F'] as const).map((s) => (
          <ToggleGroupItem key={s} value={s} className="h-10 flex-1 rounded-[8px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]">{s === 'M' ? 'Masculino' : 'Feminino'}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="idade" className={LABEL}>Idade</label>
          <NumberField id="idade" className="pr-12" unit="anos" min={0} max={120} value={value.age} onChange={(n) => set('age', n ?? undefined)} />
        </div>
        <div>
          <label htmlFor="altura" className={LABEL}>Altura</label>
          <NumberField id="altura" className="pr-11" unit="cm" min={0} max={Infinity} value={value.heightCm || undefined} onChange={(n) => set('heightCm', n ?? 0)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {TIMES.map(([k, label]) => (
          <div key={k}>
            <label htmlFor={`hora-${k}`} className={LABEL}>{label}</label>
            <Input id={`hora-${k}`} type="time" value={value[k] ?? ''} onChange={(e) => set(k, e.target.value || undefined)} />
          </div>
        ))}
      </div>
      <Chips label="Dias de treino por semana" options={DAYS} value={value.daysPerWeek} onChange={(v) => set('daysPerWeek', v)} />
      <div>
        <label htmlFor="observacoes" className={LABEL}>Lesões, limitações ou observações</label>
        <textarea id="observacoes" rows={3} className={AREA} placeholder="Ex.: dor no ombro direito" value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </div>
    </div>
  )
}
