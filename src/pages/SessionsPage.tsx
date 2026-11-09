import { useState } from 'react'
import { DEFAULTS, PAYMENT_METHOD_LABELS } from '../../shared/constants'
import { formatShortDate, formatTime, money, toDateTimeLocal } from '../../shared/format'
import type { PaymentMethod, RangeQuery, Session, SessionInput } from '../../shared/types'
import { api } from '../api'
import { Modal } from '../components/Modal'
import { PaymentFields, type PaymentDraft } from '../components/PaymentFields'
import { RangeBar } from '../components/RangeBar'
import { useToast } from '../components/Toast'
import { Badge, ErrorBanner, Field, SelectionBar } from '../components/ui'
import { useData, useSelection } from '../hooks'

interface Draft {
  name: string
  amount: string
  payment: PaymentDraft
  when: string
}

function emptyDraft(): Draft {
  return {
    name: '',
    amount: String(DEFAULTS.sessionPrice),
    payment: { method: 'cash', cash: '', transfer: '' },
    when: toDateTimeLocal(Date.now())
  }
}

function draftFrom(session: Session): Draft {
  return {
    name: session.name,
    amount: String(session.amount),
    payment: {
      method: session.paymentMethod,
      cash: session.paymentMethod === 'hybrid' ? String(session.cashAmount) : '',
      transfer: session.paymentMethod === 'hybrid' ? String(session.transferAmount) : ''
    },
    when: toDateTimeLocal(session.createdAt)
  }
}

export default function SessionsPage() {
  const notify = useToast()
  const [range, setRange] = useState<RangeQuery>({ preset: 'today' })
  const sessions = useData(() => api.sessions.list(range), [range])
  const selection = useSelection()
  const [editing, setEditing] = useState<Session | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  const rows = sessions.data ?? []
  const allSelected = rows.length > 0 && rows.every((row) => selection.has(row.id))

  const fail = (error: unknown) =>
    notify(error instanceof Error ? error.message : 'Ocurrió un error inesperado', 'error')

  const openNew = () => {
    setDraft(emptyDraft())
    setEditing('new')
  }

  const openEdit = (session: Session) => {
    setDraft(draftFrom(session))
    setEditing(session)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return

    const input: SessionInput = {
      name: draft.name,
      amount: Number(draft.amount),
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
        await api.sessions.create(input)
        notify('Sesión registrada', 'success')
      } else {
        await api.sessions.update(editing.id, input)
        notify('Sesión actualizada', 'success')
      }
      setEditing(null)
      sessions.reload()
    } catch (error) {
      fail(error)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ids: number[]) => {
    const label = ids.length === 1 ? 'este registro' : `${ids.length} registros`
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return
    try {
      await api.sessions.remove(ids)
      selection.clear()
      sessions.reload()
      notify('Registro eliminado', 'success')
    } catch (error) {
      fail(error)
    }
  }

  const exportRows = async () => {
    try {
      const path = await api.sessions.exportCsv(selection.ids)
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
        <button type="button" className="btn btn-primary" onClick={openNew}>
          + Nueva sesión
        </button>
      </div>

      {sessions.error && <ErrorBanner message={sessions.error} />}

      <section className="card">
        <header className="card-head">
          <div>
            <h3>Sesiones registradas</h3>
            <p className="card-subtitle">El nombre, el valor y el medio de pago son editables.</p>
          </div>
        </header>

        <SelectionBar
          count={selection.ids.length}
          onClear={selection.clear}
          onExport={exportRows}
          onDelete={() => remove(selection.ids)}
        />

        {sessions.loading && !sessions.data ? (
          <p className="empty-state">Cargando sesiones…</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">No hay sesiones en el período seleccionado.</p>
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
                  <th>Entrada</th>
                  <th>Medio</th>
                  <th className="num">Efectivo</th>
                  <th className="num">Transferencia</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((session) => (
                  <tr key={session.id}>
                    <td className="check">
                      <input
                        type="checkbox"
                        checked={selection.has(session.id)}
                        onChange={() => selection.toggle(session.id)}
                        aria-label={`Seleccionar ${session.name}`}
                      />
                    </td>
                    <td>
                      <strong>{session.name}</strong>
                    </td>
                    <td>{when(session.createdAt)}</td>
                    <td>
                      <Badge tone={session.paymentMethod === 'hybrid' ? 'warn' : 'neutral'}>
                        {PAYMENT_METHOD_LABELS[session.paymentMethod]}
                      </Badge>
                    </td>
                    <td className="num">{money(session.cashAmount)}</td>
                    <td className="num">{money(session.transferAmount)}</td>
                    <td className="num">
                      <strong>{money(session.amount)}</strong>
                    </td>
                    <td className="row-actions">
                      <button type="button" className="link" onClick={() => openEdit(session)}>
                        Editar
                      </button>
                      <button type="button" className="link link-danger" onClick={() => remove([session.id])}>
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

      {editing && (
        <Modal
          title={editing === 'new' ? 'Nueva sesión' : 'Editar sesión'}
          onClose={() => setEditing(null)}
        >
          <form className="form-grid" onSubmit={submit}>
            <Field label="Nombre" hint="Si se deja vacío se asigna “Sesión N”.">
              <input
                value={draft.name}
                maxLength={80}
                placeholder="Sesión N"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Valor">
              <input
                type="number"
                min="1"
                step="100"
                required
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              />
            </Field>
            <PaymentFields
              amount={Number(draft.amount) || 0}
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
