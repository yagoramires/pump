import { daysBetween, todayKey } from '../lib/date'
import { DEFAULTS, USER_KEYS, VALID, isObj, type Settings, type UserData } from '../schema'
import { allData, load, replaceAll, save } from './db'
import { shareFile } from '../lib/share'

export interface BackupFile { app: 'pump'; version: 1; exportedAt: string; data: Record<string, unknown> }

export const buildBackup = (data: Record<string, unknown>, now: Date): BackupFile => ({
  app: 'pump',
  version: 1,
  exportedAt: now.toISOString(),
  data,
})

export function parseBackup(text: string): BackupFile {
  let b: unknown
  try {
    b = JSON.parse(text)
  } catch {
    throw new Error('Arquivo não é um backup válido')
  }
  if (!isObj(b)) throw new Error('Arquivo não é um backup válido')
  if (b.app !== 'pump') throw new Error('Esse arquivo não é um backup do Pump')
  if (b.version !== 1) throw new Error('Backup de uma versão mais nova do app')
  const { data } = b
  const isUserKey = (k: string): k is keyof UserData => (USER_KEYS as readonly string[]).includes(k)
  const known = (k: string, v: unknown) =>
    isUserKey(k) || (k.startsWith('photo:') && typeof v === 'string' && v.startsWith('data:image/'))
  if (!isObj(data) || Object.entries(data).some(([k, v]) => !known(k, v))) {
    throw new Error('Backup com conteúdo desconhecido')
  }
  const ok = Object.entries(data).every(([k, v]) => !isUserKey(k) || VALID[k](v))
  if (!ok) throw new Error('Backup corrompido')
  return b as unknown as BackupFile
}

export const daysWithoutBackup = (s: Settings, today: string): number | undefined => {
  const since = s.lastBackupAt ?? s.firstUseAt
  return since ? daysBetween(since, today) : undefined
}

export const BACKUP_REMINDER_DAYS = 14

export const backupDue = (s: Settings, today: string): boolean => (daysWithoutBackup(s, today) ?? 0) >= BACKUP_REMINDER_DAYS

export async function exportBackup(now = new Date()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const day = todayKey(now)
  try {
    const file = new File([JSON.stringify(buildBackup(await allData(), now))], `pump-backup-${day}.json`, { type: 'application/json' })
    const result = await shareFile(file)
    if (result === 'cancelled') return result
    await save('settings', { ...(await load('settings') ?? DEFAULTS.settings), lastBackupAt: day })
    return result
  } catch (e) {
    // quem chama mostra a mensagem na tela: nada de erro cru do navegador em inglês
    console.error(e)
    throw new Error('Não consegui enviar o backup. Tente de novo.', { cause: e })
  }
}

export async function importBackupFile(file: File): Promise<void> {
  const b = parseBackup(await file.text())
  await replaceAll(b.data)
}
