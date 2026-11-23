import type { ReactNode } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOpenSettings } from './openSettings'

/** título da aba em display, com o contexto (data, período) embaixo em meta */
export function TabHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: string; actions?: ReactNode }) {
  const openSettings = useOpenSettings()
  return (
    <header className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-display font-bold tracking-tight text-strong">{title}</h1>
        {eyebrow && <p className="truncate text-meta text-text-2">{eyebrow}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {openSettings && <Button type="button" variant="secondary" size="icon" aria-label="Configurações" onClick={openSettings}><SettingsIcon aria-hidden="true" /></Button>}
      </div>
    </header>
  )
}
