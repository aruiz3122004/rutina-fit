import { useState } from 'react'
import { money } from '../../shared/format'
import type { RangeQuery } from '../../shared/types'
import { api } from '../api'
import { useToast } from '../components/Toast'
import { Badge, ErrorBanner, Kpi } from '../components/ui'
import { useData } from '../hooks'

const TODAY: RangeQuery = { preset: 'today' }

export default function DashboardPage() {
  const notify = useToast()
  const summary = useData(() => api.metrics.summary(TODAY), [])
  const preview = useData(() => api.whatsapp.preview(TODAY), [])
  const [sending, setSending] = useState(false)
  const [reason, setReason] = useState<string | null>(null)

  const data = summary.data
  const revenue = data?.revenue.total ?? 0
  const cashShare = revenue > 0 ? Math.round(((data?.revenue.cash ?? 0) / revenue) * 100) : 0

  const sendToOwner = async () => {
    setSending(true)
    setReason(null)
    try {
      const result = await api.whatsapp.send(TODAY)
      if (result.sent) {
        notify('Resumen enviado por WhatsApp', 'success')
      } else {
        setReason(result.reason ?? 'No fue posible enviar el mensaje automáticamente')
        notify(result.reason ?? 'Usa el enlace de WhatsApp Web', 'info')
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al enviar', 'error')
    } finally {
      setSending(false)
    }
  }

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview.data?.text ?? '')
      notify('Resumen copiado', 'success')
    } catch {
      notify('No fue posible copiar el texto', 'error')
    }
  }

  return (
    <div className="stack">
      <div className="page-intro">
        <div>
          <h2>Resumen de hoy</h2>
          <p>Estado operativo de la recepción y envío diario al dueño.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            summary.reload()
            preview.reload()
          }}
        >
          Actualizar
        </button>
      </div>

      {summary.error && <ErrorBanner message={summary.error} />}

      <div className="kpi-grid">
        <Kpi
          label="Recaudo total"
          value={money(revenue)}
          detail="Sesiones + mensualidades + inventario"
          tone="dark"
        />
        <Kpi
          label="Sesiones"
          value={String(data?.sessions.count ?? 0)}
          detail={money(data?.sessions.total ?? 0)}
          tone="brand"
        />
        <Kpi
          label="Mensualidades"
          value={String(data?.memberships.count ?? 0)}
          detail={money(data?.memberships.total ?? 0)}
        />
        <Kpi
          label="Inventario"
          value={`${data?.inventory.units ?? 0} un.`}
          detail={money(data?.inventory.total ?? 0)}
        />
      </div>

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <h3>Recaudo de hoy</h3>
          </header>
          <div className="revenue-row">
            <span>Efectivo</span>
            <strong>{money(data?.revenue.cash ?? 0)}</strong>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${cashShare}%` }} />
          </div>
          <div className="revenue-row muted">
            <span>Transferencias</span>
            <strong>{money(data?.revenue.transfer ?? 0)}</strong>
          </div>
          <div className="revenue-split">
            <span>{cashShare}% efectivo</span>
            <span>{100 - cashShare}% transferencias</span>
          </div>
        </section>

        <section className="card">
          <header className="card-head">
            <h3>Inventario vendido</h3>
            <Badge tone="neutral">{data?.inventory.units ?? 0} unidades</Badge>
          </header>
          {data && data.inventory.items.length > 0 ? (
            <ul className="simple-list">
              {data.inventory.items.map((item) => (
                <li key={item.productId}>
                  <span>
                    {item.name} <small>× {item.quantity}</small>
                  </span>
                  <strong>{money(item.total)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Aún no hay ventas de inventario hoy.</p>
          )}
        </section>
      </div>

      <section className="card">
        <header className="card-head card-head-wrap">
          <div>
            <h3>Enviar datos al dueño</h3>
            <p className="card-subtitle">Mismo resumen que se envía por WhatsApp.</p>
          </div>
          <Badge tone={preview.data?.configured ? 'ok' : 'warn'}>
            {preview.data?.configured ? 'Cloud API configurada' : 'Enlace manual'}
          </Badge>
        </header>

        {preview.error && <ErrorBanner message={preview.error} />}
        <textarea className="summary-preview" readOnly rows={11} value={preview.data?.text ?? 'Cargando…'} />
        {reason && <p className="inline-note">{reason}</p>}

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={sendToOwner} disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar por WhatsApp'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!preview.data?.waLink}
            onClick={() => {
              const text = preview.data?.text
              if (text) void api.whatsapp.openChat(text).catch((error: Error) => notify(error.message, 'error'))
            }}
          >
            Abrir WhatsApp Web
          </button>
          <button type="button" className="btn btn-ghost" onClick={copyPreview}>
            Copiar texto
          </button>
        </div>
      </section>
    </div>
  )
}
