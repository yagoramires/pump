import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { IconDot } from './IconDot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** abre uma tela por cima das Configurações; sem argumento volta pro menu */
export type OpenView = (view?: ReactNode) => void

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <>
      <div id={id} className="label-caps px-1 pt-4 pb-1.5 tracking-caps-wide">{title}</div>
      <Card size="flush" role="group" aria-labelledby={id}>{children}</Card>
    </>
  )
}

export function SettingsRow({ icon, color, title, sub, onClick }: { icon: ReactNode; color: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 rounded-none border-t border-line px-3.5 py-2 text-left font-normal first:border-t-0" onClick={onClick}>
      <IconDot size={36} color={color}>{icon}</IconDot>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-strong">{title}</span>
        {sub && <span className="block text-meta text-text-2">{sub}</span>}
      </span>
      <ChevronRight size={18} className="text-faint" aria-hidden="true" />
    </Button>
  )
}
