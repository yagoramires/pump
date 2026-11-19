import type { Angle, PhotoSet } from './types'
import { usePersisted } from '@/storage/db'
import { deletePhotos } from '@/storage/photos'
import { photoIds, setAngle } from './photoSets'

/** para quem grava; quem só lê usa `usePersisted('photoSets')` */
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
