import type { Exercise } from '../types'

export const IMAGE_BASE =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/'

export const imageUrl = (path: string): string => IMAGE_BASE + path

const OFFLINE = 'Sem internet para carregar o catálogo'

export async function fetchCatalog(): Promise<Exercise[]> {
  let res: Response
  try {
    res = await fetch(`${import.meta.env.BASE_URL}catalog/exercises.json`)
  } catch {
    throw new Error(OFFLINE)
  }
  if (!res.ok) throw new Error(OFFLINE)
  return res.json()
}
