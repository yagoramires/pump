import { useEffect, useRef, useState } from 'react'

/** rascunho de um editor; com `onChange` (editor web) cada mudança sai na hora, menos o estado inicial.
 * Compara com o último avisado, não com o inicial: voltar ao começo (arrasto desfeito) também é mudança pra quem ouve */
export function useEditorDraft<T>(init: () => T, onChange: ((v: T) => void) | undefined) {
  const [draft, setDraft] = useState(init)
  const sent = useRef(draft)
  const notify = useRef(onChange)
  useEffect(() => { notify.current = onChange })
  useEffect(() => {
    if (draft === sent.current) return
    sent.current = draft
    notify.current?.(draft)
  }, [draft])
  return [draft, setDraft] as const
}
