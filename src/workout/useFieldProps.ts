import { useRef } from 'react'

export function useFieldProps() {
  const typed = useRef(false)
  return {
    autoComplete: 'off',
    enterKeyHint: 'done' as const,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      const t = e.currentTarget
      typed.current = false
      t.select()
      // iOS reposiciona o cursor após o foco; só reaplica se ainda não digitaram
      requestAnimationFrame(() => typed.current || t.setSelectionRange(0, t.value.length))
    },
    onInput: () => { typed.current = true },
  }
}
