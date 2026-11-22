import { useMemo } from 'react'
import { usePersisted } from '@/storage/db'
import { trainingSessions } from './extra'

export function useTrainingLog() {
  const [workoutLog] = usePersisted('workoutLog')
  const [extraLog] = usePersisted('extraLog')
  const training = useMemo(() => trainingSessions(workoutLog, extraLog), [workoutLog, extraLog])
  return { training, workoutLog, extraLog }
}
