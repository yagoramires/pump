import { useState } from 'react'
import type { Profile } from './types'
import { usePersisted } from '@/storage/db'
import { NumberField } from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const LABEL = 'label-caps mb-1.5 block tracking-[0.08em]'

export function ProfileForm({ submitLabel, onDone }: { submitLabel: string; onDone: () => void }) {
  const [start, setProfile] = usePersisted('profile')
  const [sex, setSex] = useState(start.sex)
  // undefined = vazio, null = texto inválido; 0 conta como vazio
  const [height, setHeight] = useState<number | null | undefined>(start.heightCm || undefined)
  const [weight, setWeight] = useState<number | null | undefined>(start.weightKg || undefined)
  const ok = !!height && !!weight
  return (
    <div className="flex flex-1 flex-col gap-4">
      <ToggleGroup type="single" spacing={1} value={sex} onValueChange={(v) => v && setSex(v as Profile['sex'])} aria-label="Sexo" className="w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]">
        {(['M', 'F'] as const).map((s) => (
          <ToggleGroupItem key={s} value={s} className="h-10 flex-1 rounded-[8px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]">{s === 'M' ? 'Masculino' : 'Feminino'}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div>
        <label htmlFor="altura" className={LABEL}>Altura</label>
        <NumberField id="altura" className="pr-11" unit="cm" min={0} max={Infinity} value={height ?? undefined} onChange={setHeight} />
      </div>
      <div>
        <label htmlFor="peso" className={LABEL}>Peso</label>
        <NumberField id="peso" className="pr-11" unit="kg" min={0} max={Infinity} value={weight ?? undefined} onChange={setWeight} />
      </div>
      <p className="rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">Seus dados ficam só neste aparelho.</p>
      <Button type="button" className="mt-auto" disabled={!ok} onClick={() => { setProfile({ ...start, sex, heightCm: height!, weightKg: weight! }); onDone() }}>{submitLabel}</Button>
    </div>
  )
}
