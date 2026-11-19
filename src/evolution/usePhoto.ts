import { useEffect, useState } from 'react'
import { loadPhoto } from '@/storage/photos'

export function usePhoto(id?: string): string | undefined {
  const [got, setGot] = useState<{ id: string; src?: string }>()
  useEffect(() => {
    if (!id) return
    let alive = true
    loadPhoto(id).then((src) => alive && setGot({ id, src })).catch(() => {}) // guarded já avisou onStorageError
    return () => { alive = false }
  }, [id])
  return got?.id === id ? got?.src : undefined
}
