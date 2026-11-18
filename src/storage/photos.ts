import { delMany, get, set } from 'idb-keyval'
import { guarded } from './db'

// fotos ficam fora do store (UserData): chave photo:<id>, direto no idb-keyval
export const photoKey = (id: string) => `photo:${id}`
export const isPhotoKey = (k: string) => k.startsWith('photo:')

export async function savePhoto(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) throw new Error('a foto não é imagem')
  const id = crypto.randomUUID()
  await guarded(() => set(photoKey(id), dataUrl))
  return id
}

export const loadPhoto = (id: string): Promise<string | undefined> => get<string>(photoKey(id))

export const deletePhotos = (ids: string[]): Promise<void> => delMany(ids.map(photoKey))
