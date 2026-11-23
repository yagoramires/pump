import type { ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type HandleProps = { label: string } & Record<string, unknown>

export function DragHandle({ label, className, ...rest }: HandleProps & { className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} className={cn('cursor-grab touch-none text-faint', className)} {...rest}>
      <GripVertical size={20} aria-hidden="true" />
    </Button>
  )
}

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
