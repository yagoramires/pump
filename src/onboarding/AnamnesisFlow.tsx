import { useState, type ReactNode } from 'react'
import type { Profile } from '@/profile/types'
import { usePersisted } from '@/storage/db'
import { AboutForm } from '@/profile/AboutForm'
import { GoalsForm } from '@/profile/GoalsForm'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { Button } from '@/components/ui/button'
import { DayZero } from './DayZero'
import { Steps } from './Steps'

const TITLES = ['Sobre você', 'Objetivos', 'Dia zero']

/** Passos 1–3 da anamnese. O rascunho do perfil fica aqui; só o "Continuar" do passo 3 grava */
export function AnamnesisFlow({ total, onDone, onBack, first }: { total: 3 | 5; onDone: () => void; onBack?: () => void; first?: ReactNode }) {
  const [saved] = usePersisted('profile')
  const [draft, setDraft] = useState<Profile>({ ...saved, focus: saved.focus ?? 'hipertrofia' })
  const [step, setStep] = useState(0)
  const title = TITLES[step]
  return (
    <div className="flex min-h-[calc(100dvh-var(--main-pt)-var(--main-pb))] flex-col gap-4 pb-20">
      {step === 0 && !onBack ? (
        <div>
          <Steps n={1} total={total} />
          <h1 className="text-[26px] font-bold tracking-tight text-strong">{title}</h1>
        </div>
      ) : (
        <div>
          <Steps n={step + 1} total={total} />
          <BackHeader title={title} onBack={() => (step ? setStep(step - 1) : onBack?.())} className="py-0" />
        </div>
      )}
      {step === 0 && (
        <>
          <AboutForm value={draft} onChange={setDraft} />
          {first}
          <BottomBar><Button type="button" className="w-full" disabled={!draft.heightCm} onClick={() => setStep(1)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 1 && (
        <>
          <GoalsForm value={draft} onChange={setDraft} />
          <BottomBar><Button type="button" className="w-full" onClick={() => setStep(2)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 2 && <DayZero profile={draft} onDone={onDone} />}
    </div>
  )
}
