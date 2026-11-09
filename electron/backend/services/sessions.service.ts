import { dayKey, startOfDay, DAY_MS } from '../../../shared/dates'
import { formatDateTime } from '../../../shared/format'
import type { Session } from '../../../shared/types'
import { PAYMENT_METHOD_LABELS } from '../../../shared/constants'
import { parsePaymentMethod, parseRange, splitPayment } from '../range'
import { sessionsRepo } from '../repositories/sessions.repo'
import { id, idList, optionalText, positiveInt, record, timestampOrNow, ValidationError } from '../validation'
import { saveCsv } from './export.service'

interface SessionFields {
  name: string
  amount: number
  paymentMethod: Session['paymentMethod']
  cashAmount: number
  transferAmount: number
  createdAt: number
}

function parseFields(value: unknown, fallbackCreatedAt?: number): SessionFields {
  const input = record(value)
  const amount = positiveInt(input.amount, 'El valor de la sesión')
  const paymentMethod = parsePaymentMethod(input.paymentMethod)
  const payment = splitPayment(amount, paymentMethod, input.cashAmount, input.transferAmount)
  const createdAt =
    input.createdAt === undefined ? (fallbackCreatedAt ?? Date.now()) : timestampOrNow(input.createdAt)

  return {
    name: optionalText(input.name, 80),
    amount,
    paymentMethod,
    ...payment,
    createdAt
  }
}

function defaultName(createdAt: number): string {
  const start = startOfDay(createdAt)
  const sequence = sessionsRepo.countBetween(start, start + DAY_MS) + 1
  return `Sesión ${sequence}`
}

export function listSessions(range: unknown): Session[] {
  const { start, end } = parseRange(range)
  return sessionsRepo.list(start, end)
}

export function createSession(value: unknown): Session {
  const fields = parseFields(value)
  return sessionsRepo.create({ ...fields, name: fields.name || defaultName(fields.createdAt) })
}

export function updateSession(sessionId: unknown, value: unknown): Session {
  const current = sessionsRepo.get(id(sessionId))
  if (!current) throw new ValidationError('La sesión no existe')

  const fields = parseFields(value, current.createdAt)
  const updated = sessionsRepo.update(current.id, {
    ...fields,
    name: fields.name || current.name
  })
  if (!updated) throw new ValidationError('No fue posible actualizar la sesión')
  return updated
}

export function removeSessions(ids: unknown): number {
  return sessionsRepo.remove(idList(ids))
}

export async function exportSessions(ids: unknown): Promise<string | null> {
  const rows = sessionsRepo.listByIds(idList(ids))
  if (rows.length === 0) throw new ValidationError('No hay registros para exportar')

  return saveCsv(
    `sesiones-${dayKey(Date.now())}.csv`,
    ['Nombre', 'Fecha y hora', 'Medio de pago', 'Efectivo', 'Transferencia', 'Total'],
    rows.map((row) => [
      row.name,
      formatDateTime(row.createdAt),
      PAYMENT_METHOD_LABELS[row.paymentMethod],
      row.cashAmount,
      row.transferAmount,
      row.amount
    ])
  )
}
