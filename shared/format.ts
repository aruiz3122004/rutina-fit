import { DAY_MS } from './dates'
import type { ResolvedRange } from './types'

/** Formato monetario compacto para tablas, mensajes y reportes (COP sin decimales). */
export function money(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} · ${formatTime(timestamp)}`
}

export function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function rangeLabel(range: ResolvedRange): string {
  if (range.preset === 'today') return 'Hoy'
  if (range.preset === 'week') return 'Esta semana'
  if (range.preset === 'month') return 'Este mes'
  if (range.preset === 'year') return 'Este año'
  const last = range.end - DAY_MS
  return `${formatShortDate(range.start)} – ${formatShortDate(last)}`
}

/** Valor para <input type="datetime-local" /> en hora local. */
export function toDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Valor para <input type="date" /> en hora local. */
export function toDateInput(timestamp: number): string {
  return toDateTimeLocal(timestamp).slice(0, 10)
}
