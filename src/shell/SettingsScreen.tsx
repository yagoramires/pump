import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download, List, RotateCcw, Sparkles, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, Settings } from '../types'
import { exportBackup } from '../storage/backup'
import { usePersisted } from '../storage/db'
import { daysBetween, todayKey } from '../lib/date'
import { formatKg } from '../lib/number'
import { IconDot } from '@/components/IconDot'
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
        <span className="block text-[15px] font-semibold text-strong">{title}</span>
        {sub && <span className="block text-[13px] text-text-2">{sub}</span>}
      </span>
      <ChevronRight size={18} className="text-faint" aria-hidden="true" />
    </button>
  )
}

const Group = ({ children }: { children: ReactNode }) => <div className="overflow-hidden rounded-[14px] border border-border bg-panel">{children}</div>

function BackHeader({ title, onBack, label = 'Voltar' }: { title: string; onBack: () => void; label?: string }) {
  return (
    <header className="flex items-center gap-3 py-2">
      <button type="button" className="icon-btn" aria-label={label} onClick={onBack}><ChevronLeft size={18} /></button>
      <h1 className="flex-1 text-[19px] font-semibold text-strong">{title}</h1>
    </header>
  )
}

// tela cheia por cima da barra de abas (z-30; gavetas e diálogos são z-50)
export const Overlay = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-0 z-30 overflow-y-auto bg-bg">
    <div className="mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
  </div>
)

export function SettingsScreen({ settings, onClose, setSettings }: { settings: Settings; onClose: () => void; setSettings: (f: (s: Settings) => Settings) => void }) {
  const [view, setView] = useState<View>('menu')
  const [confirmRedo, setConfirmRedo] = useState(false)
  const [profile] = usePersisted('profile', NO_PROFILE)
  const back = () => setView('menu')

  if (view === 'plan') return <Overlay><PlanEditor onDone={back} onCancel={back} /></Overlay>
  if (view === 'import') return <Overlay><PlanImport onDone={back} onBack={back} /></Overlay>
  if (view === 'profile') return <Overlay><BackHeader title="Perfil" onBack={back} /><div className="mt-3"><ProfileForm submitLabel="Salvar" onDone={back} /></div></Overlay>

  const days = settings.lastBackupAt ? daysBetween(settings.lastBackupAt, todayKey()) : undefined
  const last = days === undefined ? 'Nunca' : days === 0 ? 'Último: hoje' : `Último: há ${days} ${days === 1 ? 'dia' : 'dias'}`

  return (
    <Overlay>
      <BackHeader title="Configurações" onBack={onClose} label="Fechar configurações" />
      <div className={LABEL}>TREINO</div>
      <Group>
        <Row icon={<List size={18} aria-hidden="true" />} color="var(--c1)" title="Editar plano" onClick={() => setView('plan')} />
        <Row icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Importar/exportar via IA" onClick={() => setView('import')} />
        <Row icon={<User size={18} aria-hidden="true" />} color="var(--c2)" title="Perfil" sub={profile.weightKg && profile.heightCm ? `${formatKg(profile.weightKg)} kg · ${profile.heightCm} cm` : undefined} onClick={() => setView('profile')} />
      </Group>
      <div className={LABEL}>SEUS DADOS</div>
      <Group>
        <Row icon={<Download size={18} aria-hidden="true" />} color="var(--c6)" title="Exportar backup" sub={last} onClick={() => exportBackup().catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao exportar'))} />
        <ImportBackupButton label="Restaurar backup" variant="row" />
      </Group>
      <p className="mt-2.5 rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">Seus dados ficam só neste aparelho. Exporte um backup de vez em quando.</p>
      <div className="mt-2.5"><Group>
        <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left" onClick={() => setConfirmRedo(true)}>
          <IconDot size={36} color="var(--color-negative)"><RotateCcw size={18} aria-hidden="true" /></IconDot>
          <span className="text-[15px] font-semibold text-negative">Refazer montagem</span>
        </button>
      </Group></div>
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
    </Overlay>
  )
}
