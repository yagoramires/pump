import { useEffect, useState } from 'react'
import { loadPhoto } from '../storage/photos'

/** data URL da foto; undefined enquanto carrega ou se o id não existe */
export function usePhoto(id?: string): string | undefined {
  const [got, setGot] = useState<{ id: string; src?: string }>()
  useEffect(() => {
    if (!id) return
    let alive = true
    loadPhoto(id).then((src) => alive && setGot({ id, src })).catch(() => {})
    return () => { alive = false }
  }, [id])
  // trocou o id: não mostra a foto anterior enquanto a nova carrega
  return got?.id === id ? got?.src : undefined
}
