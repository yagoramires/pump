import { useEffect, useRef, useState } from 'react'

/** rascunho de um editor; com `onChange` (editor web) cada mudança sai na hora, menos o estado inicial */
export function useEditorDraft<T>(init: () => T, onChange: ((v: T) => void) | undefined) {
  const [draft, setDraft] = useState(init)
  const first = useRef(draft)
  const notify = useRef(onChange)
  useEffect(() => { notify.current = onChange })
  useEffect(() => {
    if (draft !== first.current) notify.current?.(draft)
  }, [draft])
  return [draft, setDraft] as const
}
