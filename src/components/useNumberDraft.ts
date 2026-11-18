import { useState } from 'react'
import { formatInput, parseInRange } from '@/lib/number'

type Draft = { text: string; value?: number; typed: boolean }

/** onChange: número dentro de [min, max]; `undefined` = vazio; `null` = texto que não vale (o campo fica aria-invalid) */
export function useNumberDraft(value: number | undefined, min: number, max: number, onChange: (n: number | undefined | null) => void) {
  const [draft, setDraft] = useState<Draft>()
  // a resposta do dono à digitação (arredondar, limitar) chega no mesmo render: adota o valor novo uma vez
  if (draft?.typed) setDraft({ ...draft, value, typed: false })
  const shown = draft && (draft.typed || draft.value === value) ? draft.text : value === undefined ? '' : formatInput(value)
  const invalid = !!shown.trim() && parseInRange(shown, min, max) === null
  return {
    value: shown,
    'aria-invalid': invalid || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value
      setDraft({ text, value, typed: true })
      onChange(text.trim() ? parseInRange(text, min, max) : undefined)
    },
    onBlur: () => setDraft(undefined),
  }
}
