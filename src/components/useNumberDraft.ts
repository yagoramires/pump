import { useState } from 'react'
import { formatInput, parseInRange } from '@/lib/number'

type Draft = { text: string; value?: number; typed: boolean; from?: number }

/** onChange: número dentro de [min, max]; `undefined` = vazio; texto que não vale devolve o valor de antes da edição (o campo fica aria-invalid) */
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
      const from = draft ? draft.from : value
      setDraft({ text, value, typed: true, from })
      const n = text.trim() ? parseInRange(text, min, max) : undefined
      // senão "2500" num campo até 2000 deixaria gravado o último prefixo válido, 250
      onChange(n === null ? from : n)
    },
    onBlur: () => setDraft(undefined),
  }
}
