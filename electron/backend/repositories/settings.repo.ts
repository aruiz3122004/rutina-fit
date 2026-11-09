import { getDb } from '../database'

interface SettingsRow {
  key: string
  value: string
}

/** Ajustes locales en formato JSON. Ideal para configuración y credenciales locales. */
export const settingsRepo = {
  get<T>(key: string): T | undefined {
    const row = getDb().prepare('SELECT key, value FROM settings WHERE key = ?').get(key) as SettingsRow | undefined
    if (!row) return undefined
    try {
      return JSON.parse(row.value) as T
    } catch {
      return undefined
    }
  },

  set(key: string, value: unknown): void {
    getDb()
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), Date.now())
  }
}
