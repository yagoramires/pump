import { daysBetween, todayKey } from '../lib/date'
import { DEFAULT_SETTINGS, USER_KEYS, type Settings } from '../types'
import { allData, load, replaceAll, save } from './db'

export interface BackupFile { app: 'pump'; version: 1; exportedAt: string; data: Record<string, unknown> }

export const buildBackup = (data: Record<string, unknown>, now: Date): BackupFile => ({
  app: 'pump',
  version: 1,
  exportedAt: now.toISOString(),
  data,
})

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

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
  if (!isObj(data) || Object.keys(data).some((k) => !(USER_KEYS as readonly string[]).includes(k))) {
    throw new Error('Backup com conteúdo desconhecido')
  }
  const plan = data.workoutPlan
  if ((plan !== undefined && !(isObj(plan) && Array.isArray(plan.workouts))) || (data.workoutLog !== undefined && !isObj(data.workoutLog))) {
    throw new Error('Backup corrompido')
  }
  return b as unknown as BackupFile
}

export const backupDue = (s: Settings, today: string): boolean => {
  const since = s.lastBackupAt ?? s.firstUseAt
  return since ? daysBetween(since, today) >= 14 : false
}

export async function exportBackup(now = new Date()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const day = todayKey(now)
  const file = new File([JSON.stringify(buildBackup(await allData(), now))], `pump-backup-${day}.json`, { type: 'application/json' })
  let result: 'shared' | 'downloaded'
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      throw e
    }
    result = 'shared'
  } else {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    result = 'downloaded'
  }
  await save('settings', { ...(await load('settings') ?? DEFAULT_SETTINGS), lastBackupAt: day })
  return result
}

// jsdom's File may lack .text()
const readText = (f: File) => (f.text ? f.text() : new Response(f).text())

export async function importBackupFile(file: File): Promise<void> {
  const b = parseBackup(await readText(file))
  await replaceAll(b.data)
}
