import { getDb } from '../database'

export interface Totals {
  count: number
  total: number
  cash: number
  transfer: number
}

export interface SalesTotals extends Totals {
  units: number
}

export interface InventoryItemRow {
  productId: number
  name: string
  quantity: number
  total: number
}

export interface MovementRow {
  created_at: number
  amount: number
  kind: 'sessions' | 'memberships' | 'inventory'
}

const TOTALS = `
  COUNT(*) AS count,
  COALESCE(SUM(amount), 0) AS total,
  COALESCE(SUM(cash_amount), 0) AS cash,
  COALESCE(SUM(transfer_amount), 0) AS transfer`

export const metricsRepo = {
  sessionsTotals(start: number, end: number): Totals {
    return getDb()
      .prepare(`SELECT ${TOTALS} FROM sessions WHERE created_at >= ? AND created_at < ?`)
      .get(start, end) as Totals
  },

  membershipsTotals(start: number, end: number): Totals {
    return getDb()
      .prepare(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(price), 0) AS total,
                COALESCE(SUM(cash_amount), 0) AS cash,
                COALESCE(SUM(transfer_amount), 0) AS transfer
         FROM memberships WHERE created_at >= ? AND created_at < ?`
      )
      .get(start, end) as Totals
  },

  inventoryTotals(start: number, end: number): SalesTotals {
    return getDb()
      .prepare(
        `SELECT ${TOTALS}, COALESCE(SUM(quantity), 0) AS units
         FROM product_sales WHERE created_at >= ? AND created_at < ?`
      )
      .get(start, end) as SalesTotals
  },

  inventoryItems(start: number, end: number): InventoryItemRow[] {
    return getDb()
      .prepare(
        `SELECT p.id AS productId, p.name, COALESCE(SUM(s.quantity), 0) AS quantity,
                COALESCE(SUM(s.amount), 0) AS total
         FROM product_sales s JOIN products p ON p.id = s.product_id
         WHERE s.created_at >= ? AND s.created_at < ?
         GROUP BY p.id, p.name
         ORDER BY total DESC`
      )
      .all(start, end) as InventoryItemRow[]
  },

  /** Movimientos crudos de las tres fuentes, base para la serie temporal. */
  movements(start: number, end: number): MovementRow[] {
    return getDb()
      .prepare(
        `SELECT created_at, amount, 'sessions' AS kind FROM sessions WHERE created_at >= @start AND created_at < @end
         UNION ALL
         SELECT created_at, price AS amount, 'memberships' AS kind FROM memberships WHERE created_at >= @start AND created_at < @end
         UNION ALL
         SELECT created_at, amount, 'inventory' AS kind FROM product_sales WHERE created_at >= @start AND created_at < @end
         ORDER BY created_at`
      )
      .all({ start, end }) as MovementRow[]
  }
}
