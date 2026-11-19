import type { Profile } from './types'
import { NumberField } from '@/components/NumberField'
import { Chips } from '@/components/Chips'
import { TimePicker } from '@/components/TimePicker'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const LABEL = 'label-caps tracking-[0.08em]'
const FIELD = 'flex flex-col gap-1.5'
const TIMES = [['wake', 'Acorda'], ['train', 'Treina'], ['sleep', 'Dorme']] as const
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

export function AboutForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup type="single" spacing={1} value={value.sex} onValueChange={(v) => v && set('sex', v as Profile['sex'])} aria-label="Sexo" variant="segmented">
        {(['M', 'F'] as const).map((s) => (
          <ToggleGroupItem key={s} value={s} className="flex-1">{s === 'M' ? 'Masculino' : 'Feminino'}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid grid-cols-2 gap-3">
        <div className={FIELD}>
          <Label htmlFor="idade" className={LABEL}>Idade</Label>
          <NumberField id="idade" className="pr-12" unit="anos" min={0} max={120} value={value.age} onChange={(n) => set('age', n ?? undefined)} />
        </div>
        <div className={FIELD}>
          <Label htmlFor="altura" className={LABEL}>Altura</Label>
          <NumberField id="altura" className="pr-11" unit="cm" min={0} max={Infinity} value={value.heightCm || undefined} onChange={(n) => set('heightCm', n ?? 0)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {TIMES.map(([k, label]) => (
          <div key={k} className={FIELD}>
            <Label htmlFor={`hora-${k}`} className={LABEL}>{label}</Label>
            <TimePicker id={`hora-${k}`} clearable value={value[k]} onChange={(v) => set(k, v)} />
          </div>
        ))}
      </div>
      <Chips label="Dias de treino por semana" options={DAYS} value={value.daysPerWeek} onChange={(v) => set('daysPerWeek', v)} />
      <div className={FIELD}>
        <Label htmlFor="observacoes" className={LABEL}>Lesões, limitações ou observações</Label>
        <Textarea id="observacoes" rows={3} placeholder="Ex.: dor no ombro direito" value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </div>
    </div>
  )
}
