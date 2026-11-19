// fora de helpers.ts: o setup importa helpers, e o db.ts carregado ali escaparia do vi.mock('idb-keyval') dos testes
import { get, setMany } from 'idb-keyval'
import type { UserData } from '../src/schema'
import { pumpStore, resetStoreForTests } from '../src/storage/db'

/** grava direto no banco do app e esquece o que já foi lido: os dados estavam lá quando o app abriu */
export async function seedStore(data: Partial<UserData>): Promise<void> {
  await setMany(Object.entries(data), pumpStore)
  resetStoreForTests()
}

/** o que está gravado no banco do app, ou undefined se a chave nunca foi gravada */
export const stored = <K extends keyof UserData>(k: K): Promise<UserData[K] | undefined> => get(k, pumpStore)
