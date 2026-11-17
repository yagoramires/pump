import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download, List, Sparkles, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, Settings } from '../types'
import { exportBackup } from '../storage/backup'
import { usePersisted } from '../storage/db'
import { daysBetween, todayKey } from '../lib/date'
import { IconDot } from '@/components/IconDot'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ImportBackupButton } from './ImportBackupButton'
import { PlanEditor } from '../workout/PlanEditor'
import { PlanImport } from '../workout/PlanImport'
import { ProfileForm } from '../onboarding/Onboarding'

type View = 'menu' | 'plan' | 'import' | 'profile'

const NO_PROFILE: Profile = { sex: 'M', heightCm: 0, weightKg: 0 }
const LABEL = 'px-1 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-faint'

function Row({ icon, color, title, sub, onClick }: { icon: ReactNode; color: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" className="flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 py-2 text-left first:border-t-0" onClick={onClick}>
      <IconDot size={36} color={color}>{icon}</IconDot>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-strong">{title}</span>
        {sub && <span className="block text-[13px] text-text-2">{sub}</span>}
      </span>
      <ChevronRight size={18} className="text-faint" aria-hidden="true" />
    </button>
  )
}

const Group = ({ children }: { children: ReactNode }) => <div className="overflow-hidden rounded-[14px] border border-border bg-panel">{children}</div>

function BackHeader({ title, onBack, label = 'Voltar' }: { title: string; onBack: () => void; label?: string }) {
  return (
    <header className="flex items-center gap-1 py-2">
      <button type="button" className="-ml-2 flex size-11 items-center justify-center text-text-2" aria-label={label} onClick={onBack}><ChevronLeft size={22} /></button>
      <h1 className="flex-1 text-[19px] font-semibold text-strong">{title}</h1>
    </header>
  )
}

export function SettingsScreen({ settings, onClose, setSettings }: { settings: Settings; onClose: () => void; setSettings: (f: (s: Settings) => Settings) => void }) {
  const [view, setView] = useState<View>('menu')
  const [confirmRedo, setConfirmRedo] = useState(false)
  const [profile] = usePersisted('profile', NO_PROFILE)
  const back = () => setView('menu')

  if (view === 'plan') return <PlanEditor onDone={back} onCancel={back} />
  if (view === 'import') return <PlanImport onDone={back} onBack={back} />
  if (view === 'profile') return <><BackHeader title="Perfil" onBack={back} /><ProfileForm submitLabel="Salvar" onDone={back} /></>

  const days = settings.lastBackupAt ? daysBetween(settings.lastBackupAt, todayKey()) : undefined
  const last = days === undefined ? 'Nunca' : days === 0 ? 'Último: hoje' : `Último: há ${days} ${days === 1 ? 'dia' : 'dias'}`

  return (
    <div className="pb-6">
      <BackHeader title="Configurações" onBack={onClose} label="Fechar configurações" />
      <div className={LABEL}>TREINO</div>
      <Group>
        <Row icon={<List size={18} aria-hidden="true" />} color="var(--c1)" title="Editar plano" onClick={() => setView('plan')} />
        <Row icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Importar/exportar via IA" onClick={() => setView('import')} />
        <Row icon={<User size={18} aria-hidden="true" />} color="var(--c2)" title="Perfil" sub={profile.weightKg && profile.heightCm ? `${profile.weightKg} kg · ${profile.heightCm} cm` : undefined} onClick={() => setView('profile')} />
      </Group>
      <div className={LABEL}>SEUS DADOS</div>
      <Group>
        <Row icon={<Download size={18} aria-hidden="true" />} color="var(--c6)" title="Exportar backup" sub={last} onClick={() => exportBackup().catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao exportar'))} />
        <ImportBackupButton label="Restaurar backup" variant="row" />
      </Group>
      <p className="px-1 pt-3 text-xs text-faint">Seus dados ficam só neste aparelho.</p>
      <Button type="button" variant="ghost" className="mt-4 w-full text-negative hover:text-negative" onClick={() => setConfirmRedo(true)}>Refazer montagem</Button>
      <AlertDialog open={confirmRedo} onOpenChange={setConfirmRedo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refazer montagem?</AlertDialogTitle>
            <AlertDialogDescription>Você volta ao passo a passo inicial. Seus dados continuam salvos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { setSettings((s) => ({ ...s, onboardingDone: false })); onClose() }}>Refazer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
