import { useState, type ReactNode } from 'react'
import { RotateCcw, Share2, Sparkles, Upload, User } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { formatDayMonth, todayKey } from '@/lib/date'
import { ChangelogList } from './Changelog'
import { CHANGELOG } from './releases'
import { formatKg, plural } from '@/lib/number'
import { Card } from '@/components/ui/card'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SettingsRow, SettingsSection } from '@/components/SettingsSection'
import { latestWeight } from '@/evolution/measurements'
import { ProfileScreen } from '@/profile/ProfileScreen'
import { hasProfile } from '@/profile/profile'
import { WorkoutSettings } from '@/workout/WorkoutSettings'
import { DietSettings } from '@/diet/DietSettings'
import { BackupRestore } from '@/backup/BackupRestore'
import { daysSinceBackup, sendBackup } from '@/backup/backup'
import { Alert } from '@/components/ui/alert'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = usePersisted('settings')
  const [view, setView] = useState<ReactNode>()
  const [confirmRedo, setConfirmRedo] = useState(false)
  const [profile] = usePersisted('profile')
  const [measurements] = usePersisted('measurements')
  const weight = latestWeight(measurements)
  const back = () => setView(undefined)

  if (view) return <Overlay>{view}</Overlay>

  const days = daysSinceBackup(settings, todayKey())
  const last = days === undefined ? 'Nunca' : days === 0 ? 'Último: hoje' : `Último: há ${plural(days, 'dia', 'dias')}`

  return (
    <Overlay>
      <BackHeader title="Configurações" onBack={onClose} label="Fechar configurações" />
      <SettingsSection title="TREINO">
        <WorkoutSettings open={setView} />
        <SettingsRow
          icon={<User size={18} aria-hidden="true" />} color="var(--c2)" title="Perfil" sub={weight && hasProfile(profile) ? `${formatKg(weight)} kg · ${profile.heightCm} cm` : undefined}
          onClick={() => setView(<><BackHeader title="Perfil" onBack={back} /><div className="mt-3"><ProfileScreen onDone={back} /></div></>)}
        />
      </SettingsSection>
      <SettingsSection title="DIETA">
        <DietSettings open={setView} />
      </SettingsSection>
      <SettingsSection title="SEUS DADOS">
        <SettingsRow icon={<Share2 size={18} aria-hidden="true" />} color="var(--c6)" title="Enviar backup" sub={`WhatsApp, Arquivos… · ${last}`} onClick={sendBackup} />
        <BackupRestore trigger={(pick) => (
          <SettingsRow icon={<Upload size={18} aria-hidden="true" />} color="var(--c5)" title="Restaurar backup" onClick={pick} />
        )} />
      </SettingsSection>
      <SettingsSection title="APP">
        <SettingsRow
          icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c3)" title="Novidades" sub={`Atualizado em ${formatDayMonth(CHANGELOG[0].date)}`}
          onClick={() => setView(<><BackHeader title="Novidades" onBack={back} /><ChangelogList /></>)}
        />
      </SettingsSection>
      <Alert role="note" className="mt-2.5">Seus dados ficam só neste aparelho. Envie um backup de vez em quando.</Alert>
      <Card size="flush" className="mt-2.5">
        <SettingsRow icon={<RotateCcw size={18} aria-hidden="true" />} color="var(--color-negative)" title="Refazer montagem" destructive onClick={() => setConfirmRedo(true)} />
      </Card>
      <ConfirmDialog
        open={confirmRedo} title="Refazer montagem?" text="Você volta ao passo a passo inicial. Seus dados continuam salvos." confirm="Refazer" destructive
        onConfirm={() => { setSettings((s) => ({ ...s, onboardingDone: false })); onClose() }} onCancel={() => setConfirmRedo(false)}
      />
    </Overlay>
  )
}
