import { app, dialog, shell } from 'electron'
import { mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppInfo, BackupFile } from '../../../shared/types'
import { getPaths } from '../../main/paths'
import { getDatabasePath, getDb } from '../database'
import { dayKey } from '../../../shared/dates'

const MONTHLY_PATTERN = /^rutinafit-\d{4}-\d{2}\.db$/
const KEEP_MONTHLY = 12

function timestampName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const datePart = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
  const timePart = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${String(date.getMilliseconds()).padStart(3, '0')}`
  return `${datePart}_${timePart}`
}

async function writeBackup(name: string): Promise<BackupFile> {
  const { backupsDir } = getPaths()
  await mkdir(backupsDir, { recursive: true })
  const path = join(backupsDir, name)

  await getDb().backup(path)
  const info = await stat(path)
  return { filename: name, path, size: info.size, createdAt: info.mtimeMs }
}

/** Copia consistente de la base (incluye WAL) usando la API de better-sqlite3. */
export function createBackup(): Promise<BackupFile> {
  return writeBackup(`rutinafit-${timestampName()}.db`)
}

/**
 * Crea una copia mensual si aún no existe para el mes actual y conserva
 * las últimas 12. Las copias manuales no se eliminan automáticamente.
 */
export async function ensureMonthlyBackup(): Promise<BackupFile | null> {
  const { backupsDir } = getPaths()
  await mkdir(backupsDir, { recursive: true })

  const month = dayKey(Date.now()).slice(0, 7)
  const monthlyName = `rutinafit-${month}.db`
  const files = await readdir(backupsDir)
  const backup = files.includes(monthlyName) ? null : await writeBackup(monthlyName)

  const monthly = (await readdir(backupsDir)).filter((name) => MONTHLY_PATTERN.test(name)).sort().reverse()
  await Promise.all(monthly.slice(KEEP_MONTHLY).map((name) => unlink(join(backupsDir, name))))

  return backup
}

export async function listBackups(): Promise<BackupFile[]> {
  const { backupsDir } = getPaths()
  await mkdir(backupsDir, { recursive: true })
  const names = (await readdir(backupsDir)).filter((name) => name.endsWith('.db'))

  const backups = await Promise.all(
    names.map(async (name) => {
      const path = join(backupsDir, name)
      const info = await stat(path)
      return { filename: name, path, size: info.size, createdAt: info.mtimeMs }
    })
  )

  return backups.sort((a, b) => b.createdAt - a.createdAt)
}

/** Descarga asíncrona de la base a la ruta que elija el usuario. */
export async function exportDatabase(): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar base de datos',
    defaultPath: join(app.getPath('documents'), `rutinafit-${dayKey(Date.now())}.db`),
    filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }]
  })
  if (canceled || !filePath) return null

  await getDb().backup(filePath)
  return filePath
}

export async function openBackupsFolder(): Promise<void> {
  const { backupsDir } = getPaths()
  await mkdir(backupsDir, { recursive: true })
  await shell.openPath(backupsDir)
}

export function getAppInfo(): AppInfo {
  const { backupsDir } = getPaths()
  return {
    version: app.getVersion(),
    databasePath: getDatabasePath(),
    backupsDir,
    isPackaged: app.isPackaged
  }
}
