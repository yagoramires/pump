import { delMany, get, set } from 'idb-keyval'

// fotos ficam fora do store (UserData): chave photo:<id>, direto no idb-keyval
export async function savePhoto(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) throw new Error('a foto não é imagem')
  const id = crypto.randomUUID()
  try {
    await set(`photo:${id}`, dataUrl)
  } catch (e) {
    window.dispatchEvent(new CustomEvent('pump:storage-error', { detail: { message: e instanceof Error ? e.message : String(e) } }))
    throw e
  }
  return id
}

export const loadPhoto = (id: string): Promise<string | undefined> => get<string>(`photo:${id}`)

export const deletePhotos = (ids: string[]): Promise<void> => delMany(ids.map((i) => `photo:${i}`))
