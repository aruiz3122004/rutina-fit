import type { Product, ProductSale } from '../../../shared/types'
import { getDb } from '../database'
import { placeholders } from './sql'

interface ProductRow {
  id: number
  name: string
  price: number
  active: number
  created_at: number
}

interface SaleRow {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  amount: number
  payment_method: ProductSale['paymentMethod']
  cash_amount: number
  transfer_amount: number
  created_at: number
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    active: row.active === 1,
    createdAt: row.created_at
  }
}

function mapSale(row: SaleRow): ProductSale {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    amount: row.amount,
    paymentMethod: row.payment_method,
    cashAmount: row.cash_amount,
    transferAmount: row.transfer_amount,
    createdAt: row.created_at
  }
}

const SALE_FIELDS = `
  s.id, s.product_id, p.name AS product_name, s.quantity, s.unit_price, s.amount,
  s.payment_method, s.cash_amount, s.transfer_amount, s.created_at`

export const inventoryRepo = {
  products(): Product[] {
    return getDb()
      .prepare('SELECT id, name, price, active, created_at FROM products ORDER BY active DESC, name COLLATE NOCASE')
      .all()
      .map((row) => mapProduct(row as ProductRow))
  },

  product(productId: number): Product | undefined {
    const row = getDb()
      .prepare('SELECT id, name, price, active, created_at FROM products WHERE id = ?')
      .get(productId)
    return row ? mapProduct(row as ProductRow) : undefined
  },

  productByName(name: string): Product | undefined {
    const row = getDb()
      .prepare('SELECT id, name, price, active, created_at FROM products WHERE name = ? COLLATE NOCASE')
      .get(name)
    return row ? mapProduct(row as ProductRow) : undefined
  },

  createProduct(name: string, price: number, active: boolean): Product {
    const result = getDb()
      .prepare('INSERT INTO products (name, price, active, created_at) VALUES (?, ?, ?, ?)')
      .run(name, price, active ? 1 : 0, Date.now())
    return this.product(Number(result.lastInsertRowid))!
  },

  updateProduct(productId: number, name: string, price: number, active: boolean): Product | undefined {
    getDb()
      .prepare('UPDATE products SET name = ?, price = ?, active = ? WHERE id = ?')
      .run(name, price, active ? 1 : 0, productId)
    return this.product(productId)
  },

  sales(start: number, end: number): ProductSale[] {
    return getDb()
      .prepare(
        `SELECT ${SALE_FIELDS}
         FROM product_sales s JOIN products p ON p.id = s.product_id
         WHERE s.created_at >= ? AND s.created_at < ?
         ORDER BY s.created_at DESC, s.id DESC`
      )
      .all(start, end)
      .map((row) => mapSale(row as SaleRow))
  },

  salesByIds(ids: number[]): ProductSale[] {
    if (ids.length === 0) return []
    return getDb()
      .prepare(
        `SELECT ${SALE_FIELDS}
         FROM product_sales s JOIN products p ON p.id = s.product_id
         WHERE s.id IN (${placeholders(ids.length)})
         ORDER BY s.created_at DESC, s.id DESC`
      )
      .all(...ids)
      .map((row) => mapSale(row as SaleRow))
  },

  sale(saleId: number): ProductSale | undefined {
    const row = getDb()
      .prepare(
        `SELECT ${SALE_FIELDS}
         FROM product_sales s JOIN products p ON p.id = s.product_id
         WHERE s.id = ?`
      )
      .get(saleId)
    return row ? mapSale(row as SaleRow) : undefined
  },

  createSale(data: {
    productId: number
    quantity: number
    unitPrice: number
    amount: number
    paymentMethod: ProductSale['paymentMethod']
    cashAmount: number
    transferAmount: number
    createdAt: number
  }): ProductSale {
    const result = getDb()
      .prepare(
        `INSERT INTO product_sales
           (product_id, quantity, unit_price, amount, payment_method, cash_amount, transfer_amount, created_at)
         VALUES
           (@productId, @quantity, @unitPrice, @amount, @paymentMethod, @cashAmount, @transferAmount, @createdAt)`
      )
      .run(data)
    return this.sale(Number(result.lastInsertRowid))!
  },

  removeSales(ids: number[]): number {
    if (ids.length === 0) return 0
    const result = getDb()
      .prepare(`DELETE FROM product_sales WHERE id IN (${placeholders(ids.length)})`)
      .run(...ids)
    return result.changes
  }
}
