import { ANGLES, type Angle, type PhotoSet } from './types'
import { usePersisted } from '@/storage/db'
import { deletePhotos } from '@/storage/photos'
import { byDate } from './measurements'

export const hasPhoto = (s: PhotoSet) => ANGLES.some((a) => s[a])
const photoIds = (s: PhotoSet) => ANGLES.flatMap((a) => s[a] ?? [])

export const setAngle = (sets: PhotoSet[], date: string, angle: Angle, photoId: string): PhotoSet[] => {
  const cur = sets.find((s) => s.date === date)
  return byDate([...sets.filter((s) => s.date !== date), { ...(cur ?? { id: crypto.randomUUID(), date }), [angle]: photoId }])
}

export function usePhotoSets() {
  const [sets, setSets] = usePersisted('photoSets')
  // calcula sobre o valor guardado, não o do render: o PhotoCapture chama depois de um await
  const write = (change: (prev: PhotoSet[]) => PhotoSet[]) => {
    let gone: string[] = []
    setSets((prev) => {
      const next = change(prev)
      const kept = new Set(next.flatMap(photoIds))
      gone = prev.flatMap(photoIds).filter((id) => !kept.has(id))
      return next
    })
    // guarded já avisou onStorageError; falhar aqui só deixa fotos órfãs no banco, o registro já não aponta pra elas
    if (gone.length) void deletePhotos(gone).catch(() => {})
  }
  return {
    sets,
    setAngle: (date: string, angle: Angle, photoId: string) => write((prev) => setAngle(prev, date, angle, photoId)),
    removeSet: (id: string) => write((prev) => prev.filter((s) => s.id !== id)),
  }
}
