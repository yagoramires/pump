import { useEffect } from 'react'

let holds = 0
let pending = false

/** tela com rascunho que só vive na memória: enquanto montada, a versão nova do app não recarrega a página */
export function useHoldUpdates() {
  useEffect(() => {
    holds++
    return () => void holds--
  }, [])
}

/** versão nova já ativa: recarrega agora, ou fica pendente até nenhuma tela segurar (main tenta de novo a cada troca de visibilidade) */
export function reloadWhenFree() {
  pending = true
  if (holds === 0) location.reload()
}

export const reloadPending = () => pending

/** botão "Atualizar app": procura versão nova e recarrega; sem internet a busca falha, mas o reload sai do precache */
export async function updateNow() {
  try {
    await (await navigator.serviceWorker?.getRegistration())?.update()
  } catch {
    // sem rede ou sem service worker: recarrega mesmo assim
  }
  location.reload()
}
