import { useRef } from 'react'
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type UniqueIdentifier } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/** o arrastar só começa pela alça (touch-none nela): 4 px de folga separam toque de arrasto no mouse */
export function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

/** o leitor de tela fala o nome do item: cada SortableItem guarda o rótulo em data.label */
const label = (x: { id: UniqueIdentifier; data: { current?: Record<string, unknown> } } | null) =>
  String(x?.data.current?.label ?? x?.id ?? '')

export const PT_ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Pegou ${label(active)}`,
  onDragOver: ({ active, over }) => (over ? `${label(active)} passou por ${label(over)}` : `${label(active)} fora da lista`),
  onDragEnd: ({ active, over }) => (over ? `${label(active)} solto em ${label(over)}` : `${label(active)} solto`),
  onDragCancel: () => 'Arrasto cancelado',
}

/** item flutuando no DragOverlay: só levanta, nunca gira */
export const LIFTED = 'border border-border-strong bg-raised shadow-lg'

/** o onDragOver já muda o item de lista no meio do arrasto: Esc ou soltar fora de tudo voltam ao estado do começo */
export function useDragUndo<T>(state: T, setState: (v: T) => void) {
  const before = useRef<{ v: T }>(undefined)
  return {
    start: () => { before.current = { v: state } },
    end: () => { before.current = undefined },
    cancel: () => {
      if (before.current) setState(before.current.v)
      before.current = undefined
    },
  }
}
