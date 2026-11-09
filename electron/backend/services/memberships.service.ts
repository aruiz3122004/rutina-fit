import { DEFAULTS, PAYMENT_METHOD_LABELS } from '../../../shared/constants'
import { dayKey } from '../../../shared/dates'
import { formatDate, formatDateTime } from '../../../shared/format'
import type { Membership } from '../../../shared/types'
import { parsePaymentMethod, parseRange, splitPayment } from '../range'
import { membershipsRepo } from '../repositories/memberships.repo'
import { id, idList, positiveInt, record, text, timestampOrNow, ValidationError } from '../validation'
import { saveCsv } from './export.service'

interface MembershipFields {
  customerName: string
  durationDays: number
  price: number
  paymentMethod: Membership['paymentMethod']
  cashAmount: number
  transferAmount: number
  createdAt: number
}

function parseFields(value: unknown, fallbackCreatedAt?: number): MembershipFields {
  const input = record(value)
  const customerName = text(input.customerName, 'El nombre', 100)
  const durationDays =
    input.durationDays === undefined || input.durationDays === null
      ? DEFAULTS.membershipDays
      : positiveInt(input.durationDays, 'La duración')
  const price = positiveInt(input.price, 'El precio')
  const paymentMethod = parsePaymentMethod(input.paymentMethod)
  const payment = splitPayment(price, paymentMethod, input.cashAmount, input.transferAmount)
  const createdAt =
    input.createdAt === undefined ? (fallbackCreatedAt ?? Date.now()) : timestampOrNow(input.createdAt)

  return { customerName, durationDays, price, paymentMethod, ...payment, createdAt }
}

export function listMemberships(range: unknown): Membership[] {
  const { start, end } = parseRange(range)
  return membershipsRepo.list(start, end)
}

export function createMembership(value: unknown): Membership {
  return membershipsRepo.create(parseFields(value))
}

export function updateMembership(membershipId: unknown, value: unknown): Membership {
  const current = membershipsRepo.get(id(membershipId))
  if (!current) throw new ValidationError('La mensualidad no existe')

  const updated = membershipsRepo.update(current.id, parseFields(value, current.createdAt))
  if (!updated) throw new ValidationError('No fue posible actualizar la mensualidad')
  return updated
}

export function removeMemberships(ids: unknown): number {
  return membershipsRepo.remove(idList(ids))
}

export async function exportMemberships(ids: unknown): Promise<string | null> {
  const rows = membershipsRepo.listByIds(idList(ids))
  if (rows.length === 0) throw new ValidationError('No hay registros para exportar')

  return saveCsv(
    `mensualidades-${dayKey(Date.now())}.csv`,
    ['Nombre', 'Compra', 'Vence', 'Duración (días)', 'Precio', 'Medio de pago', 'Efectivo', 'Transferencia'],
    rows.map((row) => [
      row.customerName,
      formatDateTime(row.createdAt),
      formatDate(row.expiresAt),
      row.durationDays,
      row.price,
      PAYMENT_METHOD_LABELS[row.paymentMethod],
      row.cashAmount,
      row.transferAmount
    ])
  )
}
