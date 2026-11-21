import { useMemo } from 'react'
import type { EvolutionInput } from './types'
import { usePersisted } from '@/storage/db'
import { useTrainingLog } from '@/workout/useTrainingLog'

/** mesma referência enquanto nenhuma chave muda: o PDF pronto vale por ela */
export function useEvolution(): EvolutionInput {
  const { training } = useTrainingLog()
  const [workoutPlan] = usePersisted('workoutPlan')
  const [measurements] = usePersisted('measurements')
  const [photoSets] = usePersisted('photoSets')
  const [profile] = usePersisted('profile')
  const [dietLog] = usePersisted('dietLog')
  const [waterLog] = usePersisted('waterLog')
  const [dietPlan] = usePersisted('dietPlan')
  const [{ earnedAchievements }] = usePersisted('settings')
  return useMemo(
    () => ({ workoutLog: training, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan, earnedAchievements }),
    [training, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan, earnedAchievements],
  )
}
