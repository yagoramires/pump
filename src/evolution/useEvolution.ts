import { useMemo } from 'react'
import type { EvolutionInput } from './types'
import { usePersisted } from '@/storage/db'

/** as 8 chaves da Evolução num objeto só; mesma referência enquanto nenhuma muda (o PDF pronto vale por ela) */
export function useEvolution(): EvolutionInput {
  const [workoutLog] = usePersisted('workoutLog')
  const [workoutPlan] = usePersisted('workoutPlan')
  const [measurements] = usePersisted('measurements')
  const [photoSets] = usePersisted('photoSets')
  const [profile] = usePersisted('profile')
  const [dietLog] = usePersisted('dietLog')
  const [waterLog] = usePersisted('waterLog')
  const [dietPlan] = usePersisted('dietPlan')
  return useMemo(
    () => ({ workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan }),
    [workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan],
  )
}
