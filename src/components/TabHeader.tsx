import type { ReactNode } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOpenSettings } from './openSettings'

export function TabHeader({ eyebrow, title, actions }: { eyebrow: ReactNode; title?: string; actions?: ReactNode }) {
  const openSettings = useOpenSettings()
  return (
    <header className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="label-section min-w-0 truncate">{eyebrow}</span>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {openSettings && <Button type="button" variant="outline" size="icon" aria-label="Configurações" onClick={openSettings}><SettingsIcon aria-hidden="true" /></Button>}
        </div>
      </div>
      {title && <h1 className="text-display font-bold tracking-tight text-strong">{title}</h1>}
    </header>
  )
}
