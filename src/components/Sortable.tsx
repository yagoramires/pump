import type { ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type HandleProps = { label: string } & Record<string, unknown>

function DragHandle({ label, ...rest }: HandleProps) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} className="cursor-grab touch-none text-faint" {...rest}>
      <GripVertical size={20} aria-hidden="true" />
    </Button>
  )
}

export function SortableItem({ id, label, className, children }: {
  id: string
  label: string
  className?: string
  children: (h: { handle: ReactNode }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, data: { label } })
  const handle = <DragHandle label={`Mover ${label}`} ref={setActivatorNodeRef} {...attributes} {...listeners} />
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && 'rounded-card border border-dashed border-border-strong bg-transparent [&>*]:invisible')}
    >
      {children({ handle })}
    </div>
  )
}
