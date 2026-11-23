import { useState, type ReactNode } from 'react'
import { RefreshCw, Volume2, RotateCcw, Ruler, Share2, Sparkles, Upload, User } from 'lucide-react'
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
import { byDate, latestWeight } from '@/evolution/measurements'
import { MeasureDrawer } from '@/evolution/MeasureDrawer'
import { ProfileScreen } from '@/profile/ProfileScreen'
import { hasProfile } from '@/profile/profile'
import { WorkoutSettings } from '@/workout/WorkoutSettings'
import { DietSettings } from '@/diet/DietSettings'
import { BackupRestore } from '@/backup/BackupRestore'
import { daysSinceBackup, sendBackup } from '@/backup/backup'
import { Alert } from '@/components/ui/alert'
import { updateNow } from '@/lib/holdUpdates'
import { Chips } from '@/components/Chips'
import { IconDot } from '@/components/IconDot'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Theme } from '@/schema'

const THEME_LABELS: Record<Theme, string> = { dark: 'Escuro', light: 'Claro', system: 'Sistema' }

const BUILT_AT = new Date(import.meta.env.VITE_BUILT_AT).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
/** hash do commit e hora do build mudam a cada deploy: dá pra ver se a versão nova já entrou */
const versionLabel = () => `Pump v${CHANGELOG[0].version} · ${import.meta.env.VITE_COMMIT} · ${BUILT_AT}`

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = usePersisted('settings')
  const [view, setView] = useState<ReactNode>()
  const [confirmRedo, setConfirmRedo] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [profile] = usePersisted('profile')
  const [measurements] = usePersisted('measurements')
  const weight = latestWeight(measurements)
  const lastMeasure = byDate(measurements).at(-1)?.date
  const back = () => setView(undefined)

  if (view) return <Overlay>{view}</Overlay>

  const days = daysSinceBackup(settings, todayKey())
  const last = days === undefined ? 'Nunca' : days === 0 ? 'Último: hoje' : `Último: há ${plural(days, 'dia', 'dias')}`

  return (
    <Overlay>
      <BackHeader title="Configurações" onBack={onClose} label="Fechar configurações" />
      <SettingsSection title="Treino">
        <WorkoutSettings open={setView} />
        <SettingsRow
          icon={<User size={18} aria-hidden="true" />} color="var(--c2)" title="Perfil" sub={weight && hasProfile(profile) ? `${formatKg(weight)} kg · ${profile.heightCm} cm` : undefined}
          onClick={() => setView(<><BackHeader title="Perfil" onBack={back} /><div className="mt-3"><ProfileScreen onDone={back} /></div></>)}
        />
      </SettingsSection>
      <SettingsSection title="Medidas">
        <SettingsRow icon={<Ruler size={18} aria-hidden="true" />} color="var(--c6)" title="Registrar medidas" sub={lastMeasure ? `Último registro: ${formatDayMonth(lastMeasure)}` : 'Nenhum registro ainda'} onClick={() => setMeasuring(true)} />
      </SettingsSection>
      <SettingsSection title="Dieta">
        <DietSettings open={setView} />
      </SettingsSection>
      <SettingsSection title="Seus dados">
        <SettingsRow icon={<Share2 size={18} aria-hidden="true" />} color="var(--c6)" title="Enviar backup" sub={`WhatsApp, Arquivos… · ${last}`} onClick={sendBackup} />
        <BackupRestore trigger={(pick) => (
          <SettingsRow icon={<Upload size={18} aria-hidden="true" />} color="var(--c5)" title="Restaurar backup" onClick={pick} />
        )} />
      </SettingsSection>
      <SettingsSection title="App">
        <div className="px-3.5 py-3">
          <Chips label="Aparência" options={THEME_LABELS} value={settings.theme ?? 'dark'} onChange={(theme) => theme && setSettings((s) => ({ ...s, theme }))} />
        </div>
        <div className="flex min-h-14 items-center gap-3 border-t border-line px-3.5 py-2">
          <IconDot size={36} color="var(--c4)"><Volume2 size={18} aria-hidden="true" /></IconDot>
          <Label htmlFor="sound-switch" className="flex-1 text-body font-semibold normal-case tracking-normal text-strong">Som do descanso</Label>
          <Switch id="sound-switch" checked={!settings.muted} onCheckedChange={(on) => setSettings((s) => ({ ...s, muted: !on }))} />
        </div>
        <SettingsRow
          icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c3)" title="Novidades" sub={`Atualizado em ${formatDayMonth(CHANGELOG[0].date)}`}
          onClick={() => setView(<><BackHeader title="Novidades" onBack={back} /><ChangelogList /></>)}
        />
        <SettingsRow icon={<RefreshCw size={18} aria-hidden="true" />} color="var(--c2)" title="Atualizar app" sub="Busca a versão nova e recarrega" onClick={() => void updateNow()} />
      </SettingsSection>
      <Alert role="note" className="mt-2.5">Seus dados ficam só neste aparelho. Envie um backup de vez em quando.</Alert>
      <Card size="flush" className="mt-2.5">
        <SettingsRow icon={<RotateCcw size={18} aria-hidden="true" />} color="var(--color-negative)" title="Refazer montagem" destructive onClick={() => setConfirmRedo(true)} />
      </Card>
      {measuring && <MeasureDrawer date={todayKey()} onClose={() => setMeasuring(false)} />}
      <ConfirmDialog
        open={confirmRedo} title="Refazer montagem?" text="Você volta ao passo a passo inicial. Seus dados continuam salvos." confirm="Refazer" destructive
        onConfirm={() => { setSettings((s) => ({ ...s, onboardingDone: false })); onClose() }} onCancel={() => setConfirmRedo(false)}
      />
      <p className="mt-4 text-center text-caption text-faint tabular-nums">{versionLabel()}</p>
    </Overlay>
  )
}
