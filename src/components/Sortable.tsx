import type { ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type UniqueIdentifier } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

type HandleProps = { label: string } & Record<string, unknown>

export function DragHandle({ label, className, ...rest }: HandleProps & { className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} className={cn('cursor-grab touch-none text-faint', className)} {...rest}>
      <GripVertical size={20} aria-hidden="true" />
    </Button>
  )
}

/** item ordenável: enquanto é arrastado vira o lugar tracejado e o DragOverlay mostra a cópia levantada */
export function SortableItem({ id, label, data, className, children }: {
  id: string
  label: string
  data?: Record<string, unknown>
  className?: string
  children: (h: { handle: ReactNode; dragging: boolean }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, data: { ...data, label } })
  const handle = <DragHandle label={`Mover ${label}`} ref={setActivatorNodeRef} {...attributes} {...listeners} />
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && 'rounded-card border border-dashed border-border-strong bg-transparent [&>*]:invisible')}
    >
      {children({ handle, dragging: isDragging })}
    </div>
  )
}
