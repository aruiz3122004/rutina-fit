import { useState } from 'react'
import { PAYMENT_METHOD_LABELS } from '../../shared/constants'
import { formatShortDate, formatTime, money, toDateTimeLocal } from '../../shared/format'
import type {
  PaymentMethod,
  Product,
  ProductSaleInput,
  RangeQuery
} from '../../shared/types'
import { api } from '../api'
import { Modal } from '../components/Modal'
import { PaymentFields, type PaymentDraft } from '../components/PaymentFields'
import { RangeBar } from '../components/RangeBar'
import { useToast } from '../components/Toast'
import { Badge, ErrorBanner, Field, SelectionBar } from '../components/ui'
import { useData, useSelection } from '../hooks'

interface SaleDraft {
  productId: string
  quantity: string
  unitPrice: string
  payment: PaymentDraft
  when: string
}

function emptySaleDraft(product?: Product): SaleDraft {
  return {
    productId: product ? String(product.id) : '',
    quantity: '1',
    unitPrice: product ? String(product.price) : '',
    payment: { method: 'cash', cash: '', transfer: '' },
    when: toDateTimeLocal(Date.now())
  }
}

export default function InventoryPage() {
  const notify = useToast()
  const [range, setRange] = useState<RangeQuery>({ preset: 'today' })
  const products = useData(() => api.inventory.products(), [])
  const sales = useData(() => api.inventory.sales(range), [range])
  const selection = useSelection()

  const [productEditing, setProductEditing] = useState<Product | 'new' | null>(null)
  const [productDraft, setProductDraft] = useState({ name: '', price: '', active: true })
  const [saleOpen, setSaleOpen] = useState(false)
  const [saleDraft, setSaleDraft] = useState<SaleDraft>(emptySaleDraft)
  const [saving, setSaving] = useState(false)

  const rows = sales.data ?? []
  const activeProducts = (products.data ?? []).filter((product) => product.active)
  const allSelected = rows.length > 0 && rows.every((row) => selection.has(row.id))
  const salesTotal = rows.reduce((sum, row) => sum + row.amount, 0)
  const saleTotal = (Number(saleDraft.quantity) || 0) * (Number(saleDraft.unitPrice) || 0)

  const fail = (error: unknown) =>
    notify(error instanceof Error ? error.message : 'Ocurrió un error inesperado', 'error')

  const openNewProduct = () => {
    setProductDraft({ name: '', price: '', active: true })
    setProductEditing('new')
  }

  const openEditProduct = (product: Product) => {
    setProductDraft({ name: product.name, price: String(product.price), active: product.active })
    setProductEditing(product)
  }

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!productEditing) return
    setSaving(true)
    try {
      await api.inventory.saveProduct(
        { name: productDraft.name, price: Number(productDraft.price), active: productDraft.active },
        productEditing === 'new' ? undefined : productEditing.id
      )
      notify(productEditing === 'new' ? 'Producto creado' : 'Producto actualizado', 'success')
      setProductEditing(null)
      products.reload()
      sales.reload()
    } catch (error) {
      fail(error)
    } finally {
      setSaving(false)
    }
  }

  const openSale = () => {
    const product = activeProducts[0]
    if (!product) {
      notify('Primero crea o activa un producto', 'error')
      return
    }
    setSaleDraft(emptySaleDraft(product))
    setSaleOpen(true)
  }

  const submitSale = async (event: React.FormEvent) => {
    event.preventDefault()
    const input: ProductSaleInput = {
      productId: Number(saleDraft.productId),
      quantity: Number(saleDraft.quantity),
      unitPrice: Number(saleDraft.unitPrice),
      paymentMethod: saleDraft.payment.method as PaymentMethod
    }
    if (saleDraft.when) input.createdAt = new Date(saleDraft.when).getTime()
    if (saleDraft.payment.method === 'hybrid') {
      input.cashAmount = Number(saleDraft.payment.cash || 0)
      input.transferAmount = Number(saleDraft.payment.transfer || 0)
    }

    setSaving(true)
    try {
      await api.inventory.createSale(input)
      notify('Venta registrada', 'success')
      setSaleOpen(false)
      sales.reload()
    } catch (error) {
      fail(error)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ids: number[]) => {
    if (!window.confirm(`¿Eliminar ${ids.length} venta(s)? Esta acción no se puede deshacer.`)) return
    try {
      await api.inventory.removeSales(ids)
      selection.clear()
      sales.reload()
      notify('Venta eliminada', 'success')
    } catch (error) {
      fail(error)
    }
  }

  const exportRows = async () => {
    try {
      const path = await api.inventory.exportSalesCsv(selection.ids)
      if (path) notify(`Archivo exportado en ${path}`, 'success')
    } catch (error) {
      fail(error)
    }
  }

  const when = (timestamp: number) =>
    range.preset === 'today'
      ? formatTime(timestamp)
      : `${formatShortDate(timestamp)} ${formatTime(timestamp)}`

  return (
    <div className="stack">
      <div className="toolbar">
        <RangeBar
          value={range}
          onChange={(next) => {
            selection.clear()
            setRange(next)
          }}
        />
        <button type="button" className="btn btn-primary" onClick={openSale}>
          + Registrar venta
        </button>
      </div>

      {products.error && <ErrorBanner message={products.error} />}

      <section className="card">
        <header className="card-head">
          <div>
            <h3>Productos</h3>
            <p className="card-subtitle">Precios editables. Los productos inactivos no aparecen al vender.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={openNewProduct}>
            + Nuevo producto
          </button>
        </header>

        {products.data && products.data.length > 0 ? (
          <div className="product-grid">
            {products.data.map((product) => (
              <article key={product.id} className={`product-card${product.active ? '' : ' inactive'}`}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{money(product.price)}</span>
                </div>
                <div className="product-meta">
                  <Badge tone={product.active ? 'ok' : 'neutral'}>
                    {product.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <button type="button" className="link" onClick={() => openEditProduct(product)}>
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Cargando productos…</p>
        )}
      </section>

      {sales.error && <ErrorBanner message={sales.error} />}

      <section className="card">
        <header className="card-head">
          <div>
            <h3>Ventas de inventario</h3>
            <p className="card-subtitle">Agua, Energy, creatina, proteína y aminoácidos.</p>
          </div>
          <Badge tone="neutral">Total: {money(salesTotal)}</Badge>
        </header>

        <SelectionBar
          count={selection.ids.length}
          onClear={selection.clear}
          onExport={exportRows}
          onDelete={() => remove(selection.ids)}
        />

        {sales.loading && !sales.data ? (
          <p className="empty-state">Cargando ventas…</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">No hay ventas en el período seleccionado.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="check">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => selection.toggleAll(rows.map((row) => row.id))}
                      aria-label="Seleccionar todas"
                    />
                  </th>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Precio unit.</th>
                  <th className="num">Total</th>
                  <th>Fecha</th>
                  <th>Medio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => (
                  <tr key={sale.id}>
                    <td className="check">
                      <input
                        type="checkbox"
                        checked={selection.has(sale.id)}
                        onChange={() => selection.toggle(sale.id)}
                        aria-label={`Seleccionar ${sale.productName}`}
                      />
                    </td>
                    <td>
                      <strong>{sale.productName}</strong>
                    </td>
                    <td className="num">{sale.quantity}</td>
                    <td className="num">{money(sale.unitPrice)}</td>
                    <td className="num">
                      <strong>{money(sale.amount)}</strong>
                    </td>
                    <td>{when(sale.createdAt)}</td>
                    <td>
                      <Badge tone={sale.paymentMethod === 'hybrid' ? 'warn' : 'neutral'}>
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                      </Badge>
                    </td>
                    <td className="row-actions">
                      <button type="button" className="link link-danger" onClick={() => remove([sale.id])}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {productEditing && (
        <Modal
          title={productEditing === 'new' ? 'Nuevo producto' : 'Editar producto'}
          onClose={() => setProductEditing(null)}
        >
          <form className="form-grid" onSubmit={saveProduct}>
            <Field label="Nombre" span>
              <input
                value={productDraft.name}
                maxLength={60}
                required
                onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })}
              />
            </Field>
            <Field label="Precio">
              <input
                type="number"
                min="0"
                step="500"
                required
                value={productDraft.price}
                onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })}
              />
            </Field>
            <label className="check-line">
              <input
                type="checkbox"
                checked={productDraft.active}
                onChange={(event) => setProductDraft({ ...productDraft, active: event.target.checked })}
              />
              Producto activo
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setProductEditing(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {saleOpen && (
        <Modal title="Registrar venta" onClose={() => setSaleOpen(false)}>
          <form className="form-grid" onSubmit={submitSale}>
            <Field label="Producto" span>
              <select
                value={saleDraft.productId}
                required
                onChange={(event) => {
                  const product = activeProducts.find((item) => item.id === Number(event.target.value))
                  setSaleDraft({
                    ...saleDraft,
                    productId: event.target.value,
                    unitPrice: product ? String(product.price) : saleDraft.unitPrice
                  })
                }}
              >
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {money(product.price)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cantidad">
              <input
                type="number"
                min="1"
                required
                value={saleDraft.quantity}
                onChange={(event) => setSaleDraft({ ...saleDraft, quantity: event.target.value })}
              />
            </Field>
            <Field label="Precio unitario">
              <input
                type="number"
                min="0"
                step="500"
                required
                value={saleDraft.unitPrice}
                onChange={(event) => setSaleDraft({ ...saleDraft, unitPrice: event.target.value })}
              />
            </Field>
            <p className="total-hint span-2">
              Total de la venta: <strong>{money(saleTotal)}</strong>
            </p>
            <PaymentFields
              amount={saleTotal}
              value={saleDraft.payment}
              onChange={(payment) => setSaleDraft({ ...saleDraft, payment })}
            />
            <Field label="Fecha y hora">
              <input
                type="datetime-local"
                value={saleDraft.when}
                onChange={(event) => setSaleDraft({ ...saleDraft, when: event.target.value })}
              />
            </Field>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setSaleOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Registrar venta'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
