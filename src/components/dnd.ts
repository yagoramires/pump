import { useRef, useState } from 'react'
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragStartEvent, type Over, type UniqueIdentifier } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/** o leitor de tela fala o nome do item: cada SortableItem guarda o rótulo em data.label */
const label = (x: { id: UniqueIdentifier; data: { current?: Record<string, unknown> } } | null) =>
  String(x?.data.current?.label ?? x?.id ?? '')

const PT_ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Pegou ${label(active)}`,
  onDragOver: ({ active, over }) => (over ? `${label(active)} passou por ${label(over)}` : `${label(active)} fora da lista`),
  onDragEnd: ({ active, over }) => (over ? `${label(active)} solto em ${label(over)}` : `${label(active)} solto`),
  onDragCancel: () => 'Arrasto cancelado',
}

/** item flutuando no DragOverlay: só levanta, nunca gira */
export const LIFTED = 'border border-border-strong bg-raised shadow-lg'

/** o onDragOver dos editores muda o item de lista no meio do arrasto, então Esc ou soltar fora de tudo voltam ao estado do começo */
export function useEditorDrag<T>(state: T, setState: (v: T) => void) {
  // o arrastar só começa pela alça (touch-none nela): 4 px de folga separam clique de arrasto no mouse
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [dragging, setDragging] = useState<string>()
  const before = useRef<{ v: T }>(undefined)
  const stop = (undo: boolean) => {
    if (undo && before.current) setState(before.current.v)
    before.current = undefined
    setDragging(undefined)
  }
  return {
    dragging,
    context: {
      sensors,
      accessibility: { announcements: PT_ANNOUNCEMENTS },
      onDragStart: ({ active }: DragStartEvent) => {
        before.current = { v: state }
        setDragging(String(active.id))
      },
      onDragCancel: () => stop(true),
    },
    /** fim do arrasto; `false` quando soltou fora de tudo (e já desfez) */
    finish: (over: Over | null) => {
      stop(!over)
      return !!over
    },
  }
}
