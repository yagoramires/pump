import { useEffect } from 'react'
import type { WorkoutPlan } from './types'
import { imageUrl } from '@/catalog/catalog'
import { PREVIEW_CACHE } from '@/catalog/urls'
import { usePersisted } from '@/storage/db'

export const planImageUrls = (plan: WorkoutPlan): string[] => [
  ...new Set(plan.workouts.flatMap((w) => w.exercises.flatMap((e) => e.images.map(imageUrl)))),
]

export async function syncPreviewCache(plan: WorkoutPlan, cs: CacheStorage = caches): Promise<void> {
  // shortcut: dois saves seguidos podem correr em paralelo; o próximo boot corrige. Upgrade: fila se aparecer foto faltando.
  try {
    const cache = await cs.open(PREVIEW_CACHE)
    const wanted = planImageUrls(plan)
    const have = (await cache.keys()).map((r) => r.url)
    const results = await Promise.allSettled([
      ...wanted.filter((u) => !have.includes(u)).map((u) => cache.add(u)),
      ...have.filter((u) => !wanted.includes(u)).map((u) => cache.delete(u)),
    ])
    for (const r of results) if (r.status === 'rejected') console.warn('Cache de fotos:', r.reason)
  } catch (err) {
    console.warn('Cache de fotos indisponível:', err)
  }
}

/** fotos do plano no cache offline; montado uma vez no App, cobre editar, importar, restaurar backup e montagem */
export function PreviewSync() {
  const [plan] = usePersisted('workoutPlan')
  useEffect(() => void syncPreviewCache(plan), [plan])
  return null
}
