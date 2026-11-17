import type { Angle, PhotoSet } from '../types'

export function setAngle(sets: PhotoSet[], date: string, angle: Angle, photoId: string): { sets: PhotoSet[]; replaced?: string } {
  const cur = sets.find((s) => s.date === date)
  const next: PhotoSet = { ...(cur ?? { id: crypto.randomUUID(), date }), [angle]: photoId }
  const out = [...sets.filter((s) => s.date !== date), next].sort((a, b) => a.date.localeCompare(b.date))
  return { sets: out, replaced: cur?.[angle] }
}

export function removeSet(sets: PhotoSet[], id: string): { sets: PhotoSet[]; photoIds: string[] } {
  const gone = sets.find((s) => s.id === id)
  return {
    sets: sets.filter((s) => s.id !== id),
    photoIds: gone ? [gone.frente, gone.lado, gone.costas].filter((p): p is string => !!p) : [],
  }
}
