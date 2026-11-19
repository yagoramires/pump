import { useEffect } from 'react'
import { usePersisted } from '@/storage/db'
import { syncPreviewCache } from './previewCache'

export function PreviewSync() {
  const [plan] = usePersisted('workoutPlan')
  useEffect(() => void syncPreviewCache(plan), [plan])
  return null
}
