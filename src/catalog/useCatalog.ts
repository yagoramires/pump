import { useEffect, useState } from 'react'

/** lista estática do catálogo; qualquer falha do fetch é "sem internet": é a única que o usuário resolve */
export function useCatalog<T>(fetcher: () => Promise<T[]>) {
  const [list, setList] = useState<T[]>([])
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    fetcher().then(setList, () => setOffline(true))
  }, [fetcher])
  return { list, offline }
}
