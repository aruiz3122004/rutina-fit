import { DAY_MS } from '../../../shared/dates'
import type { Membership, MembershipInput } from '../../../shared/types'
import { getDb } from '../database'
import { placeholders } from './sql'

interface MembershipRow {
  id: number
  customer_name: string
  duration_days: number
  price: number
  payment_method: Membership['paymentMethod']
  cash_amount: number
  transfer_amount: number
  created_at: number
}

const FIELDS = `id, customer_name, duration_days, price, payment_method, cash_amount, transfer_amount, created_at`

function map(row: MembershipRow): Membership {
  return {
    id: row.id,
    customerName: row.customer_name,
    durationDays: row.duration_days,
    price: row.price,
    paymentMethod: row.payment_method,
    cashAmount: row.cash_amount,
    transferAmount: row.transfer_amount,
    createdAt: row.created_at,
    expiresAt: row.created_at + row.duration_days * DAY_MS
  }
}

type MembershipData = Required<
  Pick<MembershipInput, 'customerName' | 'durationDays' | 'price' | 'paymentMethod' | 'cashAmount' | 'transferAmount' | 'createdAt'>
>

export const membershipsRepo = {
  list(start: number, end: number): Membership[] {
    return getDb()
      .prepare(`SELECT ${FIELDS} FROM memberships WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC`)
      .all(start, end)
      .map((row) => map(row as MembershipRow))
  },

  get(membershipId: number): Membership | undefined {
    const row = getDb().prepare(`SELECT ${FIELDS} FROM memberships WHERE id = ?`).get(membershipId)
    return row ? map(row as MembershipRow) : undefined
  },

  listByIds(ids: number[]): Membership[] {
    if (ids.length === 0) return []
    return getDb()
      .prepare(
        `SELECT ${FIELDS} FROM memberships WHERE id IN (${placeholders(ids.length)}) ORDER BY created_at DESC, id DESC`
      )
      .all(...ids)
      .map((row) => map(row as MembershipRow))
  },

  create(data: MembershipData): Membership {
    const result = getDb()
      .prepare(
        `INSERT INTO memberships
           (customer_name, duration_days, price, payment_method, cash_amount, transfer_amount, created_at, updated_at)
         VALUES
           (@customerName, @durationDays, @price, @paymentMethod, @cashAmount, @transferAmount, @createdAt, @updatedAt)`
      )
      .run({ ...data, updatedAt: Date.now() })
    return this.get(Number(result.lastInsertRowid))!
  },

  update(membershipId: number, data: MembershipData): Membership | undefined {
    getDb()
      .prepare(
        `UPDATE memberships
         SET customer_name = @customerName, duration_days = @durationDays, price = @price,
             payment_method = @paymentMethod, cash_amount = @cashAmount,
             transfer_amount = @transferAmount, created_at = @createdAt, updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({ ...data, id: membershipId, updatedAt: Date.now() })
    return this.get(membershipId)
  },

  remove(ids: number[]): number {
    if (ids.length === 0) return 0
    const result = getDb()
      .prepare(`DELETE FROM memberships WHERE id IN (${placeholders(ids.length)})`)
      .run(...ids)
    return result.changes
  }
}
