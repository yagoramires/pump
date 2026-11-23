import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, FileInput, Sparkles, Wand2 } from 'lucide-react'
import type { PlanFile } from '@/format/planFile'
import { ExportPlanDrawer } from './ExportPlanDrawer'
import { SettingsRow } from '@/components/SettingsSection'
import { copy } from '@/lib/share'
import type { ImportMode } from './ImportFlow'

/** as mesmas três entradas de IA pra treino e dieta: ajustar copia o plano atual, gerar e converter abrem a importação */
export function AiPlanRows({ adjustPrompt, onImport, file }: { adjustPrompt: () => string; onImport: (mode: ImportMode) => void; file: () => PlanFile }) {
  const [exporting, setExporting] = useState<PlanFile>()
  // plano vazio daria um arquivo que nem o editor web nem o Converter abrem
  const exportPlan = (f: PlanFile) => (f.workout?.workouts.length || f.diet?.menus.length ? setExporting(f) : toast('Monte o plano antes de exportar.'))
  return (
    <>
      <SettingsRow icon={<Wand2 size={18} aria-hidden="true" />} color="var(--c4)" title="Ajustar com IA" sub="Copia seu plano pra pedir mudanças" onClick={() => copy(adjustPrompt(), 'Plano copiado. Cole na IA e peça os ajustes.')} />
      <SettingsRow icon={<FileDown size={18} aria-hidden="true" />} color="var(--c4)" title="Exportar plano" sub="Copiar ou gerar arquivo" onClick={() => exportPlan(file())} />
      <SettingsRow icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => onImport('ia')} />
      <SettingsRow icon={<FileInput size={18} aria-hidden="true" />} color="var(--c4)" title="Converter" onClick={() => onImport('convert')} />
      {exporting && <ExportPlanDrawer file={exporting} onClose={() => setExporting(undefined)} />}
    </>
  )
}
