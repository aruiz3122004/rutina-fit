import { useState } from 'react'
import { DEFAULTS, PAYMENT_METHOD_LABELS } from '../../shared/constants'
import { formatDate, money, toDateTimeLocal } from '../../shared/format'
import type { Membership, MembershipInput, PaymentMethod, RangeQuery } from '../../shared/types'
import { api } from '../api'
import { Modal } from '../components/Modal'
import { PaymentFields, type PaymentDraft } from '../components/PaymentFields'
import { RangeBar } from '../components/RangeBar'
import { useToast } from '../components/Toast'
import { Badge, ErrorBanner, Field, SelectionBar } from '../components/ui'
import { useData, useSelection } from '../hooks'

interface Draft {
  customerName: string
  durationDays: string
  price: string
  payment: PaymentDraft
  when: string
}

function emptyDraft(): Draft {
  return {
    customerName: '',
    durationDays: String(DEFAULTS.membershipDays),
    price: String(DEFAULTS.membershipPrice),
    payment: { method: 'cash', cash: '', transfer: '' },
    when: toDateTimeLocal(Date.now())
  }
}

function draftFrom(membership: Membership): Draft {
  return {
    customerName: membership.customerName,
    durationDays: String(membership.durationDays),
    price: String(membership.price),
    payment: {
      method: membership.paymentMethod,
      cash: membership.paymentMethod === 'hybrid' ? String(membership.cashAmount) : '',
      transfer: membership.paymentMethod === 'hybrid' ? String(membership.transferAmount) : ''
    },
    when: toDateTimeLocal(membership.createdAt)
  }
}

export default function MembershipsPage() {
  const notify = useToast()
  const [range, setRange] = useState<RangeQuery>({ preset: 'month' })
  const memberships = useData(() => api.memberships.list(range), [range])
  const selection = useSelection()
  const [editing, setEditing] = useState<Membership | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  const rows = memberships.data ?? []
  const allSelected = rows.length > 0 && rows.every((row) => selection.has(row.id))

  const fail = (error: unknown) =>
    notify(error instanceof Error ? error.message : 'Ocurrió un error inesperado', 'error')

  const openNew = () => {
    setDraft(emptyDraft())
    setEditing('new')
  }

  const openEdit = (membership: Membership) => {
    setDraft(draftFrom(membership))
    setEditing(membership)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return

    const input: MembershipInput = {
      customerName: draft.customerName,
      durationDays: Number(draft.durationDays),
      price: Number(draft.price),
      paymentMethod: draft.payment.method as PaymentMethod
    }
    if (draft.when) input.createdAt = new Date(draft.when).getTime()
    if (draft.payment.method === 'hybrid') {
      input.cashAmount = Number(draft.payment.cash || 0)
      input.transferAmount = Number(draft.payment.transfer || 0)
    }

    setSaving(true)
    try {
      if (editing === 'new') {
        await api.memberships.create(input)
        notify('Mensualidad registrada', 'success')
      } else {
        await api.memberships.update(editing.id, input)
        notify('Mensualidad actualizada', 'success')
      }
      setEditing(null)
      memberships.reload()
    } catch (error) {
      fail(error)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ids: number[]) => {
    const label = ids.length === 1 ? 'esta mensualidad' : `${ids.length} mensualidades`
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return
    try {
      await api.memberships.remove(ids)
      selection.clear()
      memberships.reload()
      notify('Registro eliminado', 'success')
    } catch (error) {
      fail(error)
    }
  }

  const exportRows = async () => {
    try {
      const path = await api.memberships.exportCsv(selection.ids)
      if (path) notify(`Archivo exportado en ${path}`, 'success')
    } catch (error) {
      fail(error)
    }
  }

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
        <button type="button" className="btn btn-primary" onClick={openNew}>
          + Nueva mensualidad
        </button>
      </div>

      {memberships.error && <ErrorBanner message={memberships.error} />}

      <section className="card">
        <header className="card-head">
          <div>
            <h3>Mensualidades</h3>
            <p className="card-subtitle">Duración y precio personalizables; vencimiento calculado automáticamente.</p>
          </div>
        </header>

        <SelectionBar
          count={selection.ids.length}
          onClear={selection.clear}
          onExport={exportRows}
          onDelete={() => remove(selection.ids)}
        />

        {memberships.loading && !memberships.data ? (
          <p className="empty-state">Cargando mensualidades…</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">No hay mensualidades en el período seleccionado.</p>
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
                  <th>Nombre</th>
                  <th>Compra</th>
                  <th>Vence</th>
                  <th className="num">Días</th>
                  <th>Medio</th>
                  <th className="num">Precio</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((membership) => {
                  const expired = membership.expiresAt < Date.now()
                  return (
                    <tr key={membership.id}>
                      <td className="check">
                        <input
                          type="checkbox"
                          checked={selection.has(membership.id)}
                          onChange={() => selection.toggle(membership.id)}
                          aria-label={`Seleccionar ${membership.customerName}`}
                        />
                      </td>
                      <td>
                        <strong>{membership.customerName}</strong>
                      </td>
                      <td>{formatDate(membership.createdAt)}</td>
                      <td>{formatDate(membership.expiresAt)}</td>
                      <td className="num">{membership.durationDays}</td>
                      <td>
                        <Badge tone={membership.paymentMethod === 'hybrid' ? 'warn' : 'neutral'}>
                          {PAYMENT_METHOD_LABELS[membership.paymentMethod]}
                        </Badge>
                      </td>
                      <td className="num">
                        <strong>{money(membership.price)}</strong>
                      </td>
                      <td>
                        <Badge tone={expired ? 'danger' : 'ok'}>{expired ? 'Vencida' : 'Vigente'}</Badge>
                      </td>
                      <td className="row-actions">
                        <button type="button" className="link" onClick={() => openEdit(membership)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="link link-danger"
                          onClick={() => remove([membership.id])}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Nueva mensualidad' : 'Editar mensualidad'}
          onClose={() => setEditing(null)}
        >
          <form className="form-grid" onSubmit={submit}>
            <Field label="Nombre del cliente">
              <input
                value={draft.customerName}
                maxLength={100}
                required
                onChange={(event) => setDraft({ ...draft, customerName: event.target.value })}
              />
            </Field>
            <Field label="Duración (días)">
              <input
                type="number"
                min="1"
                required
                value={draft.durationDays}
                onChange={(event) => setDraft({ ...draft, durationDays: event.target.value })}
              />
            </Field>
            <Field label="Precio">
              <input
                type="number"
                min="1"
                step="1000"
                required
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              />
            </Field>
            <div className="preset-row">
              {DEFAULTS.membershipPresets.map((price) => (
                <button
                  key={price}
                  type="button"
                  className={`chip${Number(draft.price) === price ? ' active' : ''}`}
                  onClick={() => setDraft({ ...draft, price: String(price) })}
                >
                  {money(price)}
                </button>
              ))}
            </div>
            <PaymentFields
              amount={Number(draft.price) || 0}
              value={draft.payment}
              onChange={(payment) => setDraft({ ...draft, payment })}
            />
            <Field label="Fecha y hora">
              <input
                type="datetime-local"
                value={draft.when}
                onChange={(event) => setDraft({ ...draft, when: event.target.value })}
              />
            </Field>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
