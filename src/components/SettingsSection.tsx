import { cn } from '@/lib/utils'
import { useId, type ReactNode } from 'react'
import { ChevronRight, FileInput, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { IconDot } from './IconDot'
import type { ImportMode } from './ImportFlow'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { makeCopy } from '@/lib/share'

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <>
      <div id={id} className="label-caps-wide px-1 pt-4 pb-1.5">{title}</div>
      <Card size="flush" role="group" aria-labelledby={id}>{children}</Card>
    </>
  )
}

export function SettingsRow({ icon, color, title, sub, onClick, destructive }: { icon: ReactNode; color: string; title: string; sub?: string; onClick: () => void; destructive?: boolean }) {
  return (
    <Button type="button" variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 rounded-none border-t border-line px-3.5 py-2 text-left font-normal first:border-t-0" onClick={onClick}>
      <IconDot size={36} color={color}>{icon}</IconDot>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body font-semibold', destructive ? 'text-negative' : 'text-strong')}>{title}</span>
        {sub && <span className="block text-meta text-text-2">{sub}</span>}
      </span>
      {!destructive && <ChevronRight size={18} className="text-faint" aria-hidden="true" />}
    </Button>
  )
}

/** as mesmas três entradas de IA pra treino e dieta: ajustar copia o plano atual, gerar e converter abrem a importação */
export function AiPlanRows({ adjustPrompt, onImport }: { adjustPrompt: () => string; onImport: (mode: ImportMode) => void }) {
  return (
    <>
      <SettingsRow icon={<Wand2 size={18} aria-hidden="true" />} color="var(--c4)" title="Ajustar com IA" sub="Copia seu plano pra pedir mudanças" onClick={() => makeCopy(toast)(adjustPrompt(), 'Plano copiado. Cole na IA e peça os ajustes.')} />
      <SettingsRow icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => onImport('ia')} />
      <SettingsRow icon={<FileInput size={18} aria-hidden="true" />} color="var(--c4)" title="Converter" onClick={() => onImport('convert')} />
    </>
  )
}
