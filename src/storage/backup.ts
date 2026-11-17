import { daysBetween, todayKey } from '../lib/date'
import { DEFAULT_SETTINGS, USER_KEYS, type Settings } from '../types'
import { allData, load, replaceAll, save } from './db'
import { shareFile } from '../lib/share'

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
  const known = (k: string, v: unknown) =>
    (USER_KEYS as readonly string[]).includes(k) || (k.startsWith('photo:') && typeof v === 'string' && v.startsWith('data:image/'))
  if (!isObj(data) || Object.entries(data).some(([k, v]) => !known(k, v))) {
    throw new Error('Backup com conteúdo desconhecido')
  }
  const { workoutPlan: plan, workoutLog: log, settings, profile, customExercises, measurements, photoSets, dietPlan, dietLog, waterLog, foods } = data
  const ok =
    (plan === undefined || (isObj(plan) && Array.isArray(plan.workouts))) &&
    (log === undefined || (isObj(log) && Object.values(log).every((d) => isObj(d) && Array.isArray(d.exercises)))) &&
    (settings === undefined || isObj(settings)) &&
    (profile === undefined || isObj(profile)) &&
    (customExercises === undefined || Array.isArray(customExercises)) &&
    (measurements === undefined || Array.isArray(measurements)) &&
    (photoSets === undefined || Array.isArray(photoSets)) &&
    (dietPlan === undefined || (isObj(dietPlan) && Array.isArray(dietPlan.meals))) &&
    (dietLog === undefined || (isObj(dietLog) && Object.values(dietLog).every((d) => isObj(d) && Array.isArray(d.meals)))) &&
    (waterLog === undefined || (isObj(waterLog) && Object.values(waterLog).every((d) => isObj(d) && typeof d.ml === 'number' && typeof d.goalMl === 'number'))) &&
    (foods === undefined || Array.isArray(foods))
  if (!ok) throw new Error('Backup corrompido')
  return b as unknown as BackupFile
}

export const daysWithoutBackup = (s: Settings, today: string): number | undefined => {
  const since = s.lastBackupAt ?? s.firstUseAt
  return since ? daysBetween(since, today) : undefined
}

export const backupDue = (s: Settings, today: string): boolean => (daysWithoutBackup(s, today) ?? 0) >= 14

export async function exportBackup(now = new Date()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const day = todayKey(now)
  try {
    const file = new File([JSON.stringify(buildBackup(await allData(), now))], `pump-backup-${day}.json`, { type: 'application/json' })
    const result = await shareFile(file)
    if (result === 'cancelled') return result
    await save('settings', { ...(await load('settings') ?? DEFAULT_SETTINGS), lastBackupAt: day })
    return result
  } catch (e) {
    // quem chama mostra a mensagem na tela: nada de erro cru do navegador em inglês
    console.error(e)
    throw new Error('Não consegui enviar o backup. Tente de novo.', { cause: e })
  }
}

// jsdom's File may lack .text()
const readText = (f: File) => (f.text ? f.text() : new Response(f).text())

export async function importBackupFile(file: File): Promise<void> {
  const b = parseBackup(await readText(file))
  await replaceAll(b.data)
}
