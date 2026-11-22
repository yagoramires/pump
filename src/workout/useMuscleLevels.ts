import { useMemo } from 'react'
import { fetchExercises } from '@/catalog/catalog'
import { useCatalog } from '@/catalog/useCatalog'
import type { Exercise } from '@/catalog/types'
import { muscleLevels } from './summary'
import type { SessionExercise } from './types'

const noCatalog = () => Promise.resolve<Exercise[]>([])

/** músculos dos exercícios; plano antigo sem `primary` busca os principais no catálogo */
export function useMuscleLevels(exercises: Pick<SessionExercise, 'exerciseId' | 'muscles' | 'primary' | 'custom'>[]) {
  const needsCatalog = exercises.some((e) => !e.custom && !e.primary)
  const { list: catalog } = useCatalog(needsCatalog ? fetchExercises : noCatalog)
  return useMemo(() => muscleLevels(exercises, new Map(catalog.map((x) => [x.id, x.primary ?? []]))), [exercises, catalog])
}
