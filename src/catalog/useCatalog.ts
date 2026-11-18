import { useEffect, useState } from 'react'

export function useCatalog<T>(fetcher: () => Promise<T[]>) {
  const [list, setList] = useState<T[]>([])
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    fetcher().then(setList, () => setOffline(true))
  }, [fetcher])
  return { list, offline }
}
