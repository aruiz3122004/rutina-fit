import { DAY_MS, eachDay, dayKey, monthKey } from '../../../shared/dates'
import { formatShortDate } from '../../../shared/format'
import type { SeriesPoint, Summary } from '../../../shared/types'
import { parseRange } from '../range'
import { metricsRepo, type MovementRow } from '../repositories/metrics.repo'

/** Rangos mayores a ~2 meses se agrupan por mes para que la gráfica siga siendo legible. */
const MONTHLY_THRESHOLD = 62 * DAY_MS

function emptyBuckets(range: { start: number; end: number }): {
  buckets: Map<string, SeriesPoint>
  monthly: boolean
} {
  const buckets = new Map<string, SeriesPoint>()
  const monthly = range.end - range.start > MONTHLY_THRESHOLD

  if (monthly) {
    const first = new Date(range.start)
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1)
    while (cursor.getTime() < range.end) {
      const key = monthKey(cursor.getTime())
      buckets.set(key, {
        key,
        label: cursor.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
        sessions: 0,
        memberships: 0,
        inventory: 0,
        total: 0
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  } else {
    for (const day of eachDay(range.start, range.end)) {
      const key = dayKey(day)
      buckets.set(key, {
        key,
        label: formatShortDate(day),
        sessions: 0,
        memberships: 0,
        inventory: 0,
        total: 0
      })
    }
  }

  return { buckets, monthly }
}

function buildSeries(range: { start: number; end: number }, movements: MovementRow[]): SeriesPoint[] {
  const { buckets, monthly } = emptyBuckets(range)

  for (const movement of movements) {
    const bucket = buckets.get(monthly ? monthKey(movement.created_at) : dayKey(movement.created_at))
    if (!bucket) continue
    bucket[movement.kind] += movement.amount
    bucket.total += movement.amount
  }

  return [...buckets.values()]
}

export function getSummary(rangeInput: unknown): Summary {
  const range = parseRange(rangeInput)
  const sessions = metricsRepo.sessionsTotals(range.start, range.end)
  const memberships = metricsRepo.membershipsTotals(range.start, range.end)
  const inventory = metricsRepo.inventoryTotals(range.start, range.end)
  const items = metricsRepo.inventoryItems(range.start, range.end)

  return {
    range,
    sessions: { count: sessions.count, total: sessions.total, cash: sessions.cash, transfer: sessions.transfer },
    memberships: {
      count: memberships.count,
      total: memberships.total,
      cash: memberships.cash,
      transfer: memberships.transfer
    },
    inventory: {
      units: inventory.units,
      total: inventory.total,
      cash: inventory.cash,
      transfer: inventory.transfer,
      items
    },
    revenue: {
      total: sessions.total + memberships.total + inventory.total,
      cash: sessions.cash + memberships.cash + inventory.cash,
      transfer: sessions.transfer + memberships.transfer + inventory.transfer
    },
    series: buildSeries(range, metricsRepo.movements(range.start, range.end))
  }
}
