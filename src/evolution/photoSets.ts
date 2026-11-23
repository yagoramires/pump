import { ANGLES, type Angle, type PhotoSet } from './types'
import { byDate } from './measurements'

export const hasPhoto = (s: PhotoSet) => ANGLES.some((a) => s[a])
export const photoCount = (s: PhotoSet | undefined) => ANGLES.filter((a) => s?.[a]).length
export const photoIds = (s: PhotoSet) => ANGLES.flatMap((a) => s[a] ?? [])

export const setAngle = (sets: PhotoSet[], date: string, angle: Angle, photoId: string): PhotoSet[] => {
  const cur = sets.find((s) => s.date === date)
  return byDate([...sets.filter((s) => s.date !== date), { ...(cur ?? { id: crypto.randomUUID(), date }), [angle]: photoId }])
}

/** tira um ângulo do dia; sem foto nenhuma, o conjunto some */
export const removeAngle = (sets: PhotoSet[], date: string, angle: Angle): PhotoSet[] =>
  sets.flatMap((s) => {
    if (s.date !== date) return [s]
    const { [angle]: _gone, ...rest } = s
    return hasPhoto(rest) ? [rest] : []
  })
