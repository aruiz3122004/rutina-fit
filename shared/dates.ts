import type { RangePreset, RangeQuery, ResolvedRange } from './types'

export const DAY_MS = 86_400_000

/** Inicio del día local que contiene `timestamp`. */
export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function addDays(timestamp: number, days: number): number {
  const date = new Date(timestamp)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

/**
 * Traduce un preset de la interfaz a un rango [start, end) en hora local.
 * La semana inicia el lunes y los rangos personalizados incluyen el día final.
 */
export function resolveRange(query: RangeQuery, now = Date.now()): ResolvedRange {
  const start = startOfDay(now)

  if (query.preset === 'custom') {
    if (!Number.isFinite(query.start) || !Number.isFinite(query.end)) {
      throw new Error('El rango personalizado requiere fecha inicial y final')
    }
    const from = startOfDay(query.start!)
    const to = startOfDay(query.end!) + DAY_MS
    if (to <= from) throw new Error('La fecha final debe ser mayor o igual a la inicial')
    return { preset: 'custom', start: from, end: to }
  }

  switch (query.preset) {
    case 'today':
      return { preset: query.preset, start, end: start + DAY_MS }
    case 'week': {
      const weekday = (new Date(start).getDay() + 6) % 7 // lunes = 0
      const monday = addDays(start, -weekday)
      return { preset: query.preset, start: monday, end: addDays(monday, 7) }
    }
    case 'month': {
      const date = new Date(start)
      return {
        preset: query.preset,
        start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime()
      }
    }
    case 'year': {
      const year = new Date(start).getFullYear()
      return {
        preset: query.preset,
        start: new Date(year, 0, 1).getTime(),
        end: new Date(year + 1, 0, 1).getTime()
      }
    }
  }
}

export function isRangePreset(value: unknown): value is RangePreset {
  return value === 'today' || value === 'week' || value === 'month' || value === 'year' || value === 'custom'
}

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthKey(timestamp: number): string {
  return dayKey(timestamp).slice(0, 7)
}

/** Recorre los días incluidos en [start, end) respetando el horario local. */
export function eachDay(start: number, end: number): number[] {
  const days: number[] = []
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) days.push(cursor)
  return days
}
