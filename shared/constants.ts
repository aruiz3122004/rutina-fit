import type { PaymentMethod } from './types'

/** Valores por defecto del negocio. Editables desde la interfaz. */
export const DEFAULTS = {
  sessionPrice: 4_000,
  membershipPrice: 60_000,
  membershipDays: 30,
  membershipPresets: [60_000, 200_000, 250_000]
} as const

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'nequi',
  'daviplata',
  'bancolombia',
  'hybrid'
]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
  hybrid: 'Híbrido'
}

export const APP_NAME = 'Rutina Fit'
