import { useState, type ReactNode } from 'react'
import { todayKey } from '@/lib/date'
import { AboutForm } from './AboutForm'
import { GoalsForm } from './GoalsForm'
import { BackHeader } from '@/components/BackHeader'
import { BottomBar } from '@/components/BottomBar'
import { Steps } from '@/components/Steps'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DayZero } from './DayZero'
import { ANAMNESIS_STEPS, ANAMNESIS_TITLES, hasProfile } from './profile'
import { useProfileDraft } from './useProfileDraft'

/** `total`: passos do fluxo em volta (o onboarding soma treino e dieta); sem `onCancel`, o 1º passo não tem voltar */
export function AnamnesisFlow({ resumeAtDayZero, total = ANAMNESIS_STEPS, onDone, onCancel, footer }: { resumeAtDayZero?: boolean; total?: number; onDone: () => void; onCancel?: () => void; footer?: ReactNode }) {
  const [today, setToday] = useState(todayKey)
  const { draft, setDraft, day, setDay, saveDraft } = useProfileDraft(today)
  const [step, setStep] = useState(resumeAtDayZero ? ANAMNESIS_STEPS - 1 : 0)
  const title = ANAMNESIS_TITLES[step]
  const canGoBack = step > 0 || !!onCancel
  return (
    <div className="flex flex-col gap-4 pb-20">
      {!canGoBack ? (
        <div className="flex flex-col gap-3">
          <Steps n={1} total={total} />
          <h1 className="text-display font-bold tracking-tight text-strong">{title}</h1>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Steps n={step + 1} total={total} />
          <BackHeader title={title} onBack={() => (step ? setStep(step - 1) : onCancel?.())} className="py-0" />
        </div>
      )}
      {step === 0 && (
        <>
          <Alert role="note">Só a altura é obrigatória. O resto deixa os prompts de IA mais precisos e dá pra completar depois em Configurações › Perfil.</Alert>
          <AboutForm value={draft} onChange={setDraft} />
          {footer}
          <BottomBar><Button type="button" className="w-full" disabled={!hasProfile(draft)} onClick={() => setStep(1)}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 1 && (
        <>
          <Alert role="note">Tudo opcional, dá pra pular.</Alert>
          <GoalsForm value={draft} onChange={setDraft} />
          <BottomBar><Button type="button" className="w-full" onClick={() => { setToday(todayKey()); setStep(2) }}>Continuar</Button></BottomBar>
        </>
      )}
      {step === 2 && (
        <DayZero
          profile={draft}
          date={today}
          checkInDay={day}
          onCheckInDayChange={setDay}
          onDone={() => {
            saveDraft(true)
            onDone()
          }}
        />
      )}
    </div>
  )
}
