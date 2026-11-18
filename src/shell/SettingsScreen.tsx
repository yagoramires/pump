import { useState, type ReactNode } from 'react'
import { RotateCcw, Share2, Upload, User } from 'lucide-react'
import { toast } from 'sonner'
import { usePersisted } from '@/storage/db'
import { daysBetween, todayKey } from '@/lib/date'
import { formatKg, plural } from '@/lib/number'
import { IconDot } from '@/components/IconDot'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SettingsRow, SettingsSection } from '@/components/SettingsSection'
import { series } from '@/evolution/measurements'
import { ProfileScreen } from '@/profile/ProfileScreen'
import { WorkoutSettings } from '@/workout/WorkoutSettings'
import { DietSettings } from '@/diet/DietSettings'
import { useBackupExport } from './useBackupExport'
import { useImportBackup } from './useImportBackup'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = usePersisted('settings')
  const [view, setView] = useState<ReactNode>()
  const [confirmRedo, setConfirmRedo] = useState(false)
  const [profile] = usePersisted('profile')
  const [measurements] = usePersisted('measurements')
  const weight = series(measurements, 'weightKg').at(-1)?.value
  const backup = useBackupExport(toast.error)
  const back = () => setView(undefined)

  if (view) return <Overlay>{view}</Overlay>

  const days = settings.lastBackupAt ? daysBetween(settings.lastBackupAt, todayKey()) : undefined
  const last = days === undefined ? 'Nunca' : days === 0 ? 'Último: hoje' : `Último: há ${plural(days, 'dia', 'dias')}`

  return (
    <Overlay>
      <BackHeader title="Configurações" onBack={onClose} label="Fechar configurações" />
      <SettingsSection title="TREINO">
        <WorkoutSettings open={setView} />
        <SettingsRow
          icon={<User size={18} aria-hidden="true" />} color="var(--c2)" title="Perfil" sub={weight && profile.heightCm ? `${formatKg(weight)} kg · ${profile.heightCm} cm` : undefined}
          onClick={() => setView(<><BackHeader title="Perfil" onBack={back} /><div className="mt-3"><ProfileScreen onDone={back} /></div></>)}
        />
      </SettingsSection>
      <SettingsSection title="DIETA">
        <DietSettings open={setView} />
      </SettingsSection>
      <SettingsSection title="SEUS DADOS">
        <SettingsRow icon={<Share2 size={18} aria-hidden="true" />} color="var(--c6)" title="Enviar backup" sub={`WhatsApp, Arquivos… · ${last}`} onClick={backup.send} />
        <RestoreRow />
      </SettingsSection>
      <p className="mt-2.5 rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">Seus dados ficam só neste aparelho. Envie um backup de vez em quando.</p>
      <div className="mt-2.5 overflow-hidden card">
        <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left" onClick={() => setConfirmRedo(true)}>
          <IconDot size={36} color="var(--color-negative)"><RotateCcw size={18} aria-hidden="true" /></IconDot>
          <span className="text-[15px] font-semibold text-negative">Refazer montagem</span>
        </button>
      </div>
      <ConfirmDialog
        open={confirmRedo} title="Refazer montagem?" text="Você volta ao passo a passo inicial. Seus dados continuam salvos." confirm="Refazer" destructive
        onConfirm={() => { setSettings((s) => ({ ...s, onboardingDone: false })); onClose() }} onCancel={() => setConfirmRedo(false)}
      />
    </Overlay>
  )
}

function RestoreRow() {
  const restore = useImportBackup()
  return (
    <>
      <SettingsRow icon={<Upload size={18} aria-hidden="true" />} color="var(--c5)" title="Restaurar backup" onClick={restore.pick} />
      {restore.input}
      {restore.error && <p role="alert" className="px-3.5 py-2 text-sm text-negative">{restore.error}</p>}
      {restore.confirm}
    </>
  )
}
