import { PAYMENT_METHODS } from '../../shared/constants'
import { isRangePreset, resolveRange } from '../../shared/dates'
import type { PaymentMethod, RangeQuery, ResolvedRange } from '../../shared/types'
import { nonNegativeInt, ValidationError } from './validation'

/** Convierte una consulta de rango no confiable (IPC) en un rango seguro. */
export function parseRange(value: unknown): ResolvedRange {
  if (!value || typeof value !== 'object') {
    throw new ValidationError('El rango de fechas no es válido')
  }
  const query = value as RangeQuery
  if (!isRangePreset(query.preset)) {
    throw new ValidationError('El rango de fechas no es válido')
  }
  try {
    return resolveRange(query)
  } catch (error) {
    throw new ValidationError(error instanceof Error ? error.message : 'El rango de fechas no es válido')
  }
}

export function parsePaymentMethod(value: unknown): PaymentMethod {
  if (typeof value !== 'string' || !PAYMENT_METHODS.includes(value as PaymentMethod)) {
    throw new ValidationError('El medio de pago no es válido')
  }
  return value as PaymentMethod
}

/**
 * Normaliza el reparto entre efectivo y transferencia.
 * - Efectivo/Nequi/Daviplata/Bancolombia: el total va al bolsillo correspondiente.
 * - Híbrido: el usuario digita ambos montos y deben sumar el total.
 */
export function splitPayment(
  amount: number,
  method: PaymentMethod,
  cashAmount: unknown,
  transferAmount: unknown
): { cashAmount: number; transferAmount: number } {
  if (method === 'cash') return { cashAmount: amount, transferAmount: 0 }

  if (method === 'hybrid') {
    const cash = nonNegativeInt(cashAmount ?? 0, 'El monto en efectivo')
    const transfer = nonNegativeInt(transferAmount ?? 0, 'El monto por transferencia')
    if (cash <= 0 || transfer <= 0) {
      throw new ValidationError('El pago híbrido requiere un monto en efectivo y otro por transferencia')
    }
    if (cash + transfer !== amount) {
      throw new ValidationError('Los montos de efectivo y transferencia deben sumar el total')
    }
    return { cashAmount: cash, transferAmount: transfer }
  }

  return { cashAmount: 0, transferAmount: amount }
}
