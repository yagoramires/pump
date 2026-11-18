import { useEffect, useRef, useState } from 'react'
import { FormatError } from '../format/envelope'

/**
 * Texto colado → revisão. Digitar espera 400 ms; arquivo escolhido revisa na hora (o mesmo arquivo de novo também).
 * `parse` lança FormatError com os problemas; `review` (assíncrono: catálogo) monta o resultado.
 * Os dois são lidos na hora de revisar: mudar alimentos/exercícios próprios no meio não refaz a revisão nem perde as trocas.
 */
export function usePastedReview<F, R>(parse: (text: string) => F, review: (file: F) => Promise<R>) {
  const [req, setReq] = useState({ text: '', now: false })
  const [result, setResult] = useState<R>()
  const [problems, setProblems] = useState<string[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [failed, setFailed] = useState(false)
  const fns = useRef({ parse, review })
  useEffect(() => { fns.current = { parse, review } })

  const set = (text: string, now = false) => {
    setReq({ text, now })
    setResult(undefined)
    setProblems([])
    setReviewing(false)
    setFailed(false)
  }

  useEffect(() => {
    if (!req.text.trim()) return
    let stale = false
    const run = async () => {
      let file: F
      try {
        file = fns.current.parse(req.text)
      } catch (e) {
        if (e instanceof FormatError) setProblems(e.problems)
        else setFailed(true)
        return
      }
      setReviewing(true)
      try {
        const r = await fns.current.review(file)
        if (!stale) setResult(r)
      } catch {
        if (!stale) setFailed(true)
      } finally {
        if (!stale) setReviewing(false)
      }
    }
    const t = setTimeout(() => void run(), req.now ? 0 : 400)
    return () => { stale = true; clearTimeout(t) }
  }, [req])

  return { text: req.text, set, result, setResult, problems, reviewing, failed }
}
