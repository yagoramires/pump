import { lazy, Suspense, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Droplet, List, RotateCcw, Share2, Sparkles, User, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULTS, type Settings } from '../schema'
import type { WaterSettings } from '../diet/types'
import { useBackupExport } from './useBackupExport'
import { usePersisted } from '../storage/db'
import { daysBetween, todayKey } from '../lib/date'
import { formatDec, formatKg, parseDecimal } from '../lib/number'
import { IconDot } from '@/components/IconDot'
import { Overlay } from '@/components/Overlay'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ImportBackupButton } from './ImportBackupButton'
import { PlanEditor } from '../workout/PlanEditor'
import { PlanImport } from '../workout/PlanImport'
import { ProfileForm } from '../onboarding/Onboarding'
import { turnWaterOn } from '../diet/water'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const DietEditor = lazy(() => import('../diet/DietEditor').then((m) => ({ default: m.DietEditor })))
const DietImport = lazy(() => import('../diet/DietImport').then((m) => ({ default: m.DietImport })))

type View = 'menu' | 'plan' | 'import' | 'profile' | 'diet' | 'diet-ia' | 'water'

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

const LIMITS = { goalMl: [250, 10000], cupMl: [50, 1000] } as const

function WaterForm({ water, ready, weightKg, setSettings }: { water?: WaterSettings; ready: boolean; weightKg: number; setSettings: (f: (s: Settings) => Settings) => void }) {
  const on = !!water?.enabled
  const [draft, setDraft] = useState(() => ({ goalMl: String(water?.goalMl ?? ''), cupMl: String(water?.cupMl ?? '') }))
  const toggle = () =>
    setSettings((s) => {
      const next = s.water?.enabled ? { ...s.water, enabled: false } : turnWaterOn(s.water, weightKg)
      setDraft({ goalMl: String(next.goalMl), cupMl: String(next.cupMl) })
      return { ...s, water: next }
    })
  const field = (k: keyof typeof LIMITS, label: string) => {
    const [min, max] = LIMITS[k]
    const n = parseDecimal(draft[k])
    const bad = n === null || n < min || n > max
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-text-2">{label}</span>
        <Input
          aria-label={label} inputMode="numeric" autoComplete="off" aria-invalid={bad} value={draft[k]}
          onChange={(e) => {
            const v = e.target.value
            setDraft((d) => ({ ...d, [k]: v }))
            const x = parseDecimal(v)
            if (x !== null && x >= min && x <= max) setSettings((s) => (s.water ? { ...s, water: { ...s.water, [k]: Math.round(x) } } : s))
          }}
        />
        {bad && <span className="text-[12.5px] text-negative">{`Entre ${formatDec(min)} e ${formatDec(max)} ml`}</span>}
      </label>
    )
  }
  return (
    <div className="mt-3 flex flex-col gap-4">
      <Group>
        <button type="button" role="switch" aria-checked={on} disabled={!ready} onClick={toggle} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left disabled:opacity-40">
          <span className="flex-1 text-[15px] font-semibold text-strong">Contador de água</span>
          <span aria-hidden="true" className={cn('relative h-8 w-13 shrink-0 rounded-full border transition-colors', on ? 'border-accent bg-accent' : 'border-border bg-surface')}>
            <span className={cn('absolute top-0.5 left-0.5 size-6 rounded-full transition-transform', on ? 'translate-x-5 bg-on-accent' : 'bg-text-2')} />
          </span>
        </button>
      </Group>
      {on && (
        <div className="grid grid-cols-2 gap-3">
          {field('goalMl', 'Meta (ml)')}
          {field('cupMl', 'Copo (ml)')}
        </div>
      )}
      <p className="text-[13px] text-text-2">Na primeira vez, a meta é 35 ml por kg do seu peso. Os copos aparecem na aba Dieta.</p>
    </div>
  )
}

export function SettingsScreen({ settings, onClose, setSettings }: { settings: Settings; onClose: () => void; setSettings: (f: (s: Settings) => Settings) => void }) {
  const [view, setView] = useState<View>('menu')
  const [confirmRedo, setConfirmRedo] = useState(false)
  const [profile, , profileLoaded] = usePersisted('profile', DEFAULTS.profile)
  const backup = useBackupExport(toast.error)
  const back = () => setView('menu')

  if (view === 'plan') return <Overlay><PlanEditor onDone={back} onCancel={back} /></Overlay>
  if (view === 'import') return <Overlay><PlanImport onDone={back} onBack={back} /></Overlay>
  if (view === 'diet') return <Overlay><Suspense fallback={<p className="text-sm text-text-2">Carregando…</p>}><DietEditor onDone={back} onCancel={back} /></Suspense></Overlay>
  if (view === 'diet-ia') return <Overlay><Suspense fallback={<p className="text-sm text-text-2">Carregando…</p>}><DietImport mode="ia" onDone={back} onBack={back} /></Suspense></Overlay>
  if (view === 'water') return <Overlay><BackHeader title="Água" onBack={back} /><WaterForm water={settings.water} ready={profileLoaded} weightKg={profile.weightKg} setSettings={setSettings} /></Overlay>
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
      <div className={LABEL}>DIETA</div>
      <Group>
        <Row icon={<Utensils size={18} aria-hidden="true" />} color="var(--c7)" title="Cardápio" onClick={() => setView('diet')} />
        <Row icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => setView('diet-ia')} />
        <Row icon={<Droplet size={18} aria-hidden="true" />} color="var(--c2)" title="Água" sub={settings.water?.enabled ? `${formatDec(settings.water.goalMl / 1000)} L por dia` : 'Desligada'} onClick={() => setView('water')} />
      </Group>
      <div className={LABEL}>SEUS DADOS</div>
      <Group>
        <Row icon={<Share2 size={18} aria-hidden="true" />} color="var(--c6)" title="Enviar backup" sub={`WhatsApp, Arquivos… · ${last}`} onClick={backup.send} />
        <ImportBackupButton label="Restaurar backup" variant="row" />
      </Group>
      <p className="mt-2.5 rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">Seus dados ficam só neste aparelho. Envie um backup de vez em quando.</p>
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
