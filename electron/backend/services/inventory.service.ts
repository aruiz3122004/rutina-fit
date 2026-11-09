import { PAYMENT_METHOD_LABELS } from '../../../shared/constants'
import { dayKey } from '../../../shared/dates'
import { formatDateTime } from '../../../shared/format'
import type { Product, ProductSale } from '../../../shared/types'
import { parsePaymentMethod, parseRange, splitPayment } from '../range'
import { inventoryRepo } from '../repositories/inventory.repo'
import {
  bool,
  id,
  idList,
  nonNegativeInt,
  positiveInt,
  record,
  text,
  timestampOrNow,
  ValidationError
} from '../validation'
import { saveCsv } from './export.service'

export function listProducts(): Product[] {
  return inventoryRepo.products()
}

/** Crea un producto si no se envía id; en caso contrario actualiza el existente. */
export function saveProduct(value: unknown, productId?: unknown): Product {
  const input = record(value)
  const name = text(input.name, 'El nombre del producto', 60)
  const price = nonNegativeInt(input.price, 'El precio')
  const duplicate = inventoryRepo.productByName(name)
  const isUpdate = productId !== undefined && productId !== null
  const current = isUpdate ? inventoryRepo.product(id(productId)) : undefined

  if (isUpdate && !current) throw new ValidationError('El producto no existe')
  if (duplicate && duplicate.id !== current?.id) {
    throw new ValidationError('Ya existe un producto con ese nombre')
  }

  const active = input.active === undefined ? (current?.active ?? true) : bool(input.active, 'El estado')
  return current
    ? inventoryRepo.updateProduct(current.id, name, price, active)!
    : inventoryRepo.createProduct(name, price, active)
}

export function listSales(range: unknown): ProductSale[] {
  const { start, end } = parseRange(range)
  return inventoryRepo.sales(start, end)
}

export function createSale(value: unknown): ProductSale {
  const input = record(value)
  const product = inventoryRepo.product(id(input.productId, 'El producto'))
  if (!product) throw new ValidationError('El producto no existe')
  if (!product.active) throw new ValidationError('El producto está inactivo')

  const quantity = positiveInt(input.quantity, 'La cantidad')
  const unitPrice =
    input.unitPrice === undefined ? product.price : nonNegativeInt(input.unitPrice, 'El precio unitario')
  const amount = quantity * unitPrice
  if (!Number.isSafeInteger(amount)) throw new ValidationError('El total de la venta es demasiado alto')

  const paymentMethod = parsePaymentMethod(input.paymentMethod)
  const payment = splitPayment(amount, paymentMethod, input.cashAmount, input.transferAmount)

  return inventoryRepo.createSale({
    productId: product.id,
    quantity,
    unitPrice,
    amount,
    paymentMethod,
    ...payment,
    createdAt: timestampOrNow(input.createdAt)
  })
}

export function removeSales(ids: unknown): number {
  return inventoryRepo.removeSales(idList(ids))
}

export async function exportSales(ids: unknown): Promise<string | null> {
  const rows = inventoryRepo.salesByIds(idList(ids))
  if (rows.length === 0) throw new ValidationError('No hay registros para exportar')

  return saveCsv(
    `inventario-${dayKey(Date.now())}.csv`,
    ['Producto', 'Cantidad', 'Precio unitario', 'Total', 'Fecha y hora', 'Medio de pago', 'Efectivo', 'Transferencia'],
    rows.map((row) => [
      row.productName,
      row.quantity,
      row.unitPrice,
      row.amount,
      formatDateTime(row.createdAt),
      PAYMENT_METHOD_LABELS[row.paymentMethod],
      row.cashAmount,
      row.transferAmount
    ])
  )
}
