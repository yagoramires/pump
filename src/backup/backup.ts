import { daysBetween, todayKey } from '@/lib/date'
import { VALID, isUserKey, type Settings } from '@/schema'
import { isObj } from '@/lib/utils'
import { allData, readCurrent, replaceAll, save } from '@/storage/db'
import { isPhotoKey, isPhotoValue } from '@/storage/photos'
import { shareFile } from '@/lib/share'

interface BackupFile { app: 'pump'; version: 1; exportedAt: string; data: Record<string, unknown> }

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
  const known = (k: string, v: unknown) => isUserKey(k) || (isPhotoKey(k) && isPhotoValue(v))
  if (!isObj(data) || Object.entries(data).some(([k, v]) => !known(k, v))) {
    throw new Error('Backup com conteúdo desconhecido')
  }
  const ok = Object.entries(data).every(([k, v]) => !isUserKey(k) || VALID[k](v))
  if (!ok) throw new Error('Backup corrompido')
  return b as unknown as BackupFile
}

const BACKUP_REMINDER_DAYS = 14

const daysSince = (day: string | undefined, today: string) => (day ? daysBetween(day, today) : undefined)

export const daysSinceBackup = (s: Settings, today: string) => daysSince(s.lastBackupAt, today)

export const backupDue = (s: Settings, today: string): number | undefined => {
  const days = daysSince(s.lastBackupAt ?? s.firstUseAt, today)
  return days !== undefined && days >= BACKUP_REMINDER_DAYS ? days : undefined
}

export async function exportBackup(now = new Date()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const day = todayKey(now)
  try {
    const file = new File([JSON.stringify(buildBackup(await allData(), now))], `pump-backup-${day}.json`, { type: 'application/json' })
    const result = await shareFile(file)
    if (result === 'cancelled') return result
    await save('settings', { ...(await readCurrent('settings')), lastBackupAt: day })
    return result
  } catch (e) {
    console.error(e)
    throw new Error('Não consegui enviar o backup. Tente de novo.', { cause: e })
  }
}

export async function importBackupFile(file: File): Promise<void> {
  const b = parseBackup(await file.text())
  await replaceAll(b.data)
}
