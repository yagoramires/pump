import { useMemo } from 'react'
import { usePersisted } from '@/storage/db'
import { trainingLog } from './extra'

/** ficha + extras num log só; mesma referência enquanto nenhum dos dois muda */
export function useTrainingLog() {
  const [workoutLog] = usePersisted('workoutLog')
  const [extraLog] = usePersisted('extraLog')
  const training = useMemo(() => trainingLog(workoutLog, extraLog), [workoutLog, extraLog])
  return { training, workoutLog, extraLog }
}
