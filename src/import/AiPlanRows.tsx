import { FileInput, Sparkles, Wand2 } from 'lucide-react'
import { SettingsRow } from '@/components/SettingsSection'
import { copy } from '@/lib/share'
import type { ImportMode } from './ImportFlow'

/** as mesmas três entradas de IA pra treino e dieta: ajustar copia o plano atual, gerar e converter abrem a importação */
export function AiPlanRows({ adjustPrompt, onImport }: { adjustPrompt: () => string; onImport: (mode: ImportMode) => void }) {
  return (
    <>
      <SettingsRow icon={<Wand2 size={18} aria-hidden="true" />} color="var(--c4)" title="Ajustar com IA" sub="Copia seu plano pra pedir mudanças" onClick={() => copy(adjustPrompt(), 'Plano copiado. Cole na IA e peça os ajustes.')} />
      <SettingsRow icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => onImport('ia')} />
      <SettingsRow icon={<FileInput size={18} aria-hidden="true" />} color="var(--c4)" title="Converter" onClick={() => onImport('convert')} />
    </>
  )
}
