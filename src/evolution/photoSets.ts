import type { Angle, PhotoSet } from './types'
import { usePersisted } from '@/storage/db'
import { deletePhotos } from '@/storage/photos'
import { byDate } from './measurements'

export const ANGLES = ['frente', 'lado', 'costas'] as const satisfies readonly Angle[]
export const ANGLE_LABEL: Record<Angle, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' }

export const hasPhoto = (s: PhotoSet) => ANGLES.some((a) => s[a])
const photoIds = (s: PhotoSet) => ANGLES.flatMap((a) => s[a] ?? [])

export const setAngle = (sets: PhotoSet[], date: string, angle: Angle, photoId: string): PhotoSet[] => {
  const cur = sets.find((s) => s.date === date)
  return byDate([...sets.filter((s) => s.date !== date), { ...(cur ?? { id: crypto.randomUUID(), date }), [angle]: photoId }])
}

/** registros de fotos; trocar ou apagar remove do banco as fotos que nenhum registro aponta mais */
export function usePhotoSets() {
  const [sets, setSets] = usePersisted('photoSets')
  const write = (next: PhotoSet[]) => {
    const kept = new Set(setSets(next).flatMap(photoIds))
    const gone = sets.flatMap(photoIds).filter((id) => !kept.has(id))
    // falhar aqui só deixa fotos órfãs no banco; o registro já não aponta pra elas
    if (gone.length) void deletePhotos(gone).catch(() => {})
  }
  return {
    sets,
    setAngle: (date: string, angle: Angle, photoId: string) => write(setAngle(sets, date, angle, photoId)),
    removeSet: (id: string) => write(sets.filter((s) => s.id !== id)),
  }
}
