import type { Angle } from './types'
import { ANGLE_LABEL, ANGLES } from './photoSets'

export function AngleTabs({ value, onChange }: { value: Angle; onChange: (a: Angle) => void }) {
  return (
    <div role="tablist" aria-label="Ângulo" className="mb-2.5 flex gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]">
      {ANGLES.map((a) => (
        <button
          key={a}
          type="button"
          role="tab"
          aria-selected={a === value}
          className="h-11 flex-1 rounded-lg text-[13px] font-semibold text-text-2 aria-selected:bg-surface aria-selected:text-strong aria-selected:shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
          onClick={() => onChange(a)}
        >
          {ANGLE_LABEL[a]}
        </button>
      ))}
    </div>
  )
}
