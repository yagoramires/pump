import { useState, type ReactNode } from 'react'
import type { Profile } from '@/profile/types'
import { usePersisted } from '@/storage/db'
import { AboutForm } from '@/profile/AboutForm'
import { GoalsForm } from '@/profile/GoalsForm'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { Button } from '@/components/ui/button'
import { DayZero } from './DayZero'
import { hasProfile, profileDraft } from '@/profile/profile'
import { Steps } from './Steps'

const TITLES = ['Sobre você', 'Objetivos', 'Dia zero']

/** Passos 1–3 da anamnese. O rascunho do perfil fica aqui; só o "Continuar" do passo 3 grava */
export function AnamnesisFlow({ total, onDone, onBack, first, start }: { total: 3 | 5; start?: number; onDone: () => void; onBack?: () => void; first?: ReactNode }) {
  const [saved] = usePersisted('profile')
  const [draft, setDraft] = useState<Profile>(() => profileDraft(saved))
  const [step, setStep] = useState(start ?? 0)
  const title = TITLES[step]
  // dentro de uma aba (onBack) a barra de abas fica embaixo: o Continuar sobe pra não ficar escondido
  const bar = onBack ? 'bottom-(--nav-h)' : undefined
  return (
    <div className="clear-both flex min-h-[calc(100dvh-var(--main-pt)-var(--main-pb))] flex-col gap-4 pb-20">
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
          <BottomBar className={bar}><Button type="button" className="w-full" disabled={!hasProfile(draft)} onClick={() => setStep(1)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 1 && (
        <>
          <GoalsForm value={draft} onChange={setDraft} />
          <BottomBar className={bar}><Button type="button" className="w-full" onClick={() => setStep(2)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 2 && <DayZero profile={draft} onDone={onDone} />}
    </div>
  )
}
