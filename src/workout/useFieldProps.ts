import { useRef } from 'react'

/** campo curto de número: sem sugestões, teclado com "OK" e o valor todo selecionado ao focar pra digitar por cima */
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
