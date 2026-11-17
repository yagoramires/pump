import type { Exercise } from '../workout/types'
import type { TacoFood } from '../diet/types'

export const IMAGE_BASE =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/'

export const imageUrl = (path: string): string => IMAGE_BASE + path

const OFFLINE = 'Sem internet para carregar o catálogo'

const getJson = async <T>(file: string, offline: string): Promise<T[]> => {
  let res: Response
  try {
    res = await fetch(`${import.meta.env.BASE_URL}catalog/${file}`)
  } catch {
    throw new Error(offline)
  }
  if (!res.ok) throw new Error(offline)
  return res.json()
}

export const fetchCatalog = <T = Exercise>(file = 'exercises.json'): Promise<T[]> => getJson<T>(file, OFFLINE)

let taco: Promise<TacoFood[]> | undefined
export function fetchTaco(): Promise<TacoFood[]> {
  taco ??= getJson<TacoFood>('taco.json', 'Sem internet para buscar na TACO').catch((e) => {
    taco = undefined
    throw e
  })
  return taco
}
