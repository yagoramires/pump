import { delMany, get, set } from 'idb-keyval'
import { guarded, pumpStore } from './db'

const photoKey = (id: string) => `photo:${id}`
export const isPhotoKey = (k: string) => k.startsWith('photo:')
export const isPhotoValue = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image/')

export async function savePhoto(dataUrl: string): Promise<string> {
  if (!isPhotoValue(dataUrl)) throw new Error('a foto não é imagem')
  const id = crypto.randomUUID()
  await guarded(() => set(photoKey(id), dataUrl, pumpStore))
  return id
}

export const loadPhoto = (id: string): Promise<string | undefined> => get<string>(photoKey(id), pumpStore)

export const deletePhotos = (ids: string[]): Promise<void> => delMany(ids.map(photoKey), pumpStore)
