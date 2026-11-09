import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getPaths } from '../main/paths'
import { migrate } from './migrations'

let connection: Database.Database | undefined
let databasePath: string | undefined

/** Abre la base local, aplica migraciones y deja la conexión lista para usar. */
export function initDatabase(): Database.Database {
  const { dataDir } = getPaths()
  mkdirSync(dataDir, { recursive: true })

  databasePath = join(dataDir, 'rutinafit.db')
  connection = new Database(databasePath)

  connection.pragma('journal_mode = WAL')
  connection.pragma('synchronous = NORMAL')
  connection.pragma('foreign_keys = ON')
  connection.pragma('busy_timeout = 5000')

  migrate(connection)
  return connection
}

export function getDb(): Database.Database {
  if (!connection) throw new Error('La base de datos no ha sido inicializada')
  return connection
}

export function getDatabasePath(): string {
  if (!databasePath) throw new Error('La base de datos no ha sido inicializada')
  return databasePath
}

export function closeDatabase(): void {
  connection?.close()
  connection = undefined
  databasePath = undefined
}
