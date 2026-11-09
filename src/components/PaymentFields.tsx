import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../shared/constants'
import { money } from '../../shared/format'
import type { PaymentMethod } from '../../shared/types'
import { Field } from './ui'

export interface PaymentDraft {
  method: PaymentMethod
  cash: string
  transfer: string
}

/** Formulario de medio de pago + reparto efectivo/transferencia para pagos híbridos. */
export function PaymentFields({
  amount,
  value,
  onChange
}: {
  amount: number
  value: PaymentDraft
  onChange: (value: PaymentDraft) => void
}) {
  const cash = Number(value.cash) || 0
  const transfer = Number(value.transfer) || 0
  const difference = amount - cash - transfer

  return (
    <>
      <Field label="Medio de pago">
        <select
          value={value.method}
          onChange={(event) => onChange({ ...value, method: event.target.value as PaymentMethod })}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </Field>

      {value.method === 'hybrid' && (
        <>
          <Field label="Monto en efectivo">
            <input
              type="number"
              min="0"
              step="100"
              value={value.cash}
              onChange={(event) => onChange({ ...value, cash: event.target.value })}
            />
          </Field>
          <Field label="Monto por transferencia">
            <input
              type="number"
              min="0"
              step="100"
              value={value.transfer}
              onChange={(event) => onChange({ ...value, transfer: event.target.value })}
            />
          </Field>
          <p className={`split-hint span-2${difference === 0 ? ' ok' : ''}`}>
            {difference === 0
              ? 'Reparto completo'
              : difference > 0
                ? `Faltan ${money(difference)} por repartir`
                : `Excede por ${money(-difference)}`}
          </p>
        </>
      )}
    </>
  )
}
