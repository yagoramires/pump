import { useState, type ReactNode } from 'react'
import type { Profile } from './types'
import { usePersisted } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { AboutForm } from './AboutForm'
import { GoalsForm } from './GoalsForm'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { Steps } from '@/components/Steps'
import { Button } from '@/components/ui/button'
import { DayZero } from './DayZero'
import { hasProfile, profileDraft } from './profile'

const TITLES = ['Sobre você', 'Objetivos', 'Dia zero']
export const ANAMNESIS_STEPS = TITLES.length

/** Passos 1–3 da anamnese. O rascunho do perfil fica aqui; o "Continuar" do passo 3 grava perfil, dia do check-in e anamnese */
export function AnamnesisFlow({ step: initial = 0, total, onDone, onCancel, footer }: { step?: number; total: number; onDone: () => void; onCancel?: () => void; footer?: ReactNode }) {
  const [saved, setProfile] = usePersisted('profile')
  const [, setSettings] = usePersisted('settings')
  const [draft, setDraft] = useState<Profile>(() => profileDraft(saved))
  const [step, setStep] = useState(initial)
  const title = TITLES[step]
  return (
    <div className="flex min-h-[calc(100dvh-var(--main-pt)-var(--main-pb))] flex-col gap-4 pb-20">
      {step === 0 && !onCancel ? (
        <div>
          <Steps n={1} total={total} />
          <h1 className="text-[26px] font-bold tracking-tight text-strong">{title}</h1>
        </div>
      ) : (
        <div>
          <Steps n={step + 1} total={total} />
          <BackHeader title={title} onBack={() => (step ? setStep(step - 1) : onCancel?.())} className="py-0" />
        </div>
      )}
      {step === 0 && (
        <>
          <AboutForm value={draft} onChange={setDraft} />
          {footer}
          <BottomBar><Button type="button" className="w-full" disabled={!hasProfile(draft)} onClick={() => setStep(1)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 1 && (
        <>
          <GoalsForm value={draft} onChange={setDraft} />
          <BottomBar><Button type="button" className="w-full" onClick={() => setStep(2)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 2 && (
        <DayZero
          profile={draft}
          onDone={(checkInDay) => {
            setProfile(draft)
            setSettings((s) => ({ ...s, checkInDay, anamnesisAt: todayKey() }))
            onDone()
          }}
        />
      )}
    </div>
  )
}
