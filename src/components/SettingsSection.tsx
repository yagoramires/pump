import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { IconDot } from './IconDot'

/** abre uma tela por cima das Configurações; sem argumento volta pro menu */
export type OpenView = (view?: ReactNode) => void

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="label-caps px-1 pt-4 pb-1.5 tracking-[.08em]">{title}</div>
      <div className="overflow-hidden card">{children}</div>
    </>
  )
}

export function SettingsRow({ icon, color, title, sub, onClick }: { icon: ReactNode; color: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" className="flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 py-2 text-left first:border-t-0" onClick={onClick}>
      <IconDot size={36} color={color}>{icon}</IconDot>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-strong">{title}</span>
        {sub && <span className="block text-[13px] text-text-2">{sub}</span>}
      </span>
      <ChevronRight size={18} className="text-faint" aria-hidden="true" />
    </button>
  )
}
