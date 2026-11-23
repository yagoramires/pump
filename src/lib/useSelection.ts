import { useState } from 'react'

/** modo "Selecionar" dos editores: liga, marca itens pelo id e desliga limpando */
export function useSelection() {
  const [on, setOn] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  return {
    on,
    selected,
    start: () => setOn(true),
    stop: () => {
      setOn(false)
      setSelected(new Set())
    },
    toggle: (id: string) =>
      setSelected((s) => {
        const next = new Set(s)
        if (!next.delete(id)) next.add(id)
        return next
      }),
  }
}
