import { useState } from 'react'
import { ArrowDown, ArrowUp, Minus, MoreHorizontal, Plus } from 'lucide-react'
import type { PlanExercise } from './types'
import { formatInput, parseDecimal } from '@/lib/number'
import { MAX_KG, SETS } from './limits'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

type Props = {
  open: boolean
  ex: PlanExercise
  onChange: (next: PlanExercise) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onClose: () => void
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const ROUND = 'flex size-11 touch-manipulation items-center justify-center rounded-xl border border-border text-strong disabled:opacity-40'
const FIELD = 'h-11 rounded-xl bg-surface px-3 text-center text-base font-semibold tabular-nums text-strong outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
const select = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line py-2">
      <span className="text-sm text-text-2">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Stepper({ label, text, value, step, min, max, onChange, children }: { label: string; text?: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void; children?: React.ReactNode }) {
  const go = (d: number) => onChange(Math.round(clamp(value + d, min, max) * 10) / 10)
  return (
    <>
      <button type="button" className={ROUND} aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => go(-step)}><Minus size={16} /></button>
      {children ?? <span className="min-w-14 text-center text-base font-semibold tabular-nums text-strong">{text}</span>}
      <button type="button" className={ROUND} aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => go(step)}><Plus size={16} /></button>
    </>
  )
}

export function ExerciseDrawer({ open, ex, onChange, onRemove, onMoveUp, onMoveDown, onClose }: Props) {
  const [menu, setMenu] = useState(false)
  const [kg, setKg] = useState<string>() // texto digitado; sem rascunho, mostra o valor salvo
  const patch = (p: Partial<PlanExercise>) => { setKg(undefined); onChange({ ...ex, ...p }) }
  const inputProps = { autoComplete: 'off', enterKeyHint: 'done' as const, onFocus: select }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="px-4 pb-5">
          <div className="flex items-start justify-between gap-2 pb-2">
            <div className="min-w-0">
              <DrawerTitle className="text-[19px] font-semibold text-strong">{ex.name}</DrawerTitle>
              <DrawerDescription className="mt-0.5 text-[13px] text-text-2 first-letter:uppercase">{ex.muscles.join(' · ')}</DrawerDescription>
            </div>
            <button type="button" className={`${ROUND} border-0`} aria-label="Mais ações" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><MoreHorizontal size={20} /></button>
          </div>
          {menu && (
            <div className="mb-2 flex gap-2">
              <Button variant="outline" className="flex-1" disabled={!onMoveUp} onClick={onMoveUp}><ArrowUp /> Subir</Button>
              <Button variant="outline" className="flex-1" disabled={!onMoveDown} onClick={onMoveDown}><ArrowDown /> Descer</Button>
            </div>
          )}
          <Row label="Séries"><Stepper label="séries" value={ex.sets} text={String(ex.sets)} step={1} min={SETS[0]} max={SETS[1]} onChange={(sets) => patch({ sets })} /></Row>
          <Row label="Repetições">
            <input className={`${FIELD} w-28`} aria-label="Repetições" value={ex.reps} onChange={(e) => onChange({ ...ex, reps: e.target.value })} {...inputProps} />
          </Row>
          <Row label="Carga">
            <Stepper label="carga" value={ex.weightKg} step={2.5} min={0} max={MAX_KG} onChange={(weightKg) => patch({ weightKg })}>
            <input
              className={`${FIELD} w-20`}
              inputMode="decimal"
              aria-label="Carga em kg"
              value={kg ?? formatInput(ex.weightKg)}
              onChange={(e) => {
                setKg(e.target.value)
                const n = parseDecimal(e.target.value)
                if (n !== null) onChange({ ...ex, weightKg: clamp(n, 0, MAX_KG) })
              }}
              onBlur={() => setKg(undefined)}
              {...inputProps}
            />
            </Stepper>
          </Row>
          <Row label="Descanso"><Stepper label="descanso" value={ex.restSec} text={`${ex.restSec} s`} step={15} min={15} max={600} onChange={(restSec) => patch({ restSec })} /></Row>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1 bg-surface text-negative hover:text-negative" onClick={onRemove}>Remover</Button>
            <Button className="flex-1" onClick={onClose}>Pronto</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
