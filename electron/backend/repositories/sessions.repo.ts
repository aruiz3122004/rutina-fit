import type { Session, SessionInput } from '../../../shared/types'
import { getDb } from '../database'
import { placeholders } from './sql'

interface SessionRow {
  id: number
  name: string
  amount: number
  payment_method: Session['paymentMethod']
  cash_amount: number
  transfer_amount: number
  created_at: number
}

const FIELDS = `id, name, amount, payment_method, cash_amount, transfer_amount, created_at`

function map(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    paymentMethod: row.payment_method,
    cashAmount: row.cash_amount,
    transferAmount: row.transfer_amount,
    createdAt: row.created_at
  }
}

export const sessionsRepo = {
  list(start: number, end: number): Session[] {
    return getDb()
      .prepare(`SELECT ${FIELDS} FROM sessions WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC`)
      .all(start, end)
      .map((row) => map(row as SessionRow))
  },

  get(sessionId: number): Session | undefined {
    const row = getDb().prepare(`SELECT ${FIELDS} FROM sessions WHERE id = ?`).get(sessionId)
    return row ? map(row as SessionRow) : undefined
  },

  listByIds(ids: number[]): Session[] {
    if (ids.length === 0) return []
    return getDb()
      .prepare(
        `SELECT ${FIELDS} FROM sessions WHERE id IN (${placeholders(ids.length)}) ORDER BY created_at DESC, id DESC`
      )
      .all(...ids)
      .map((row) => map(row as SessionRow))
  },

  countBetween(start: number, end: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS total FROM sessions WHERE created_at >= ? AND created_at < ?')
      .get(start, end) as { total: number }
    return row.total
  },

  create(data: Required<Pick<SessionInput, 'name' | 'amount' | 'paymentMethod' | 'cashAmount' | 'transferAmount' | 'createdAt'>>): Session {
    const now = Date.now()
    const result = getDb()
      .prepare(
        `INSERT INTO sessions (name, amount, payment_method, cash_amount, transfer_amount, created_at, updated_at)
         VALUES (@name, @amount, @paymentMethod, @cashAmount, @transferAmount, @createdAt, @updatedAt)`
      )
      .run({ ...data, updatedAt: now })
    return this.get(Number(result.lastInsertRowid))!
  },

  update(
    sessionId: number,
    data: Required<Pick<SessionInput, 'name' | 'amount' | 'paymentMethod' | 'cashAmount' | 'transferAmount' | 'createdAt'>>
  ): Session | undefined {
    getDb()
      .prepare(
        `UPDATE sessions
         SET name = @name, amount = @amount, payment_method = @paymentMethod,
             cash_amount = @cashAmount, transfer_amount = @transferAmount,
             created_at = @createdAt, updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({ ...data, id: sessionId, updatedAt: Date.now() })
    return this.get(sessionId)
  },

  remove(ids: number[]): number {
    if (ids.length === 0) return 0
    const result = getDb()
      .prepare(`DELETE FROM sessions WHERE id IN (${placeholders(ids.length)})`)
      .run(...ids)
    return result.changes
  }
}
