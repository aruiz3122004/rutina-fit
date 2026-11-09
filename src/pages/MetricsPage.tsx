import { useState } from 'react'
import { money, rangeLabel } from '../../shared/format'
import type { RangeQuery } from '../../shared/types'
import { api } from '../api'
import { RangeBar } from '../components/RangeBar'
import { Badge, ErrorBanner, Kpi } from '../components/ui'
import { useData } from '../hooks'

export default function MetricsPage() {
  const [range, setRange] = useState<RangeQuery>({ preset: 'month' })
  const summary = useData(() => api.metrics.summary(range), [range])

  const data = summary.data
  const series = data?.series ?? []
  const max = Math.max(...series.map((point) => point.total), 1)
  const labelStep = Math.max(1, Math.ceil(series.length / 12))
  const revenue = data?.revenue.total ?? 0
  const cashShare = revenue > 0 ? Math.round(((data?.revenue.cash ?? 0) / revenue) * 100) : 0
  const periodLabel = data
    ? rangeLabel(data.range)
    : range.preset === 'custom'
      ? 'Período personalizado'
      : rangeLabel({ preset: range.preset, start: 0, end: 86_400_000 })

  return (
    <div className="stack">
      <div className="toolbar">
        <RangeBar value={range} onChange={setRange} />
      </div>

      {summary.error && <ErrorBanner message={summary.error} />}

      <div className="kpi-grid">
        <Kpi label="Recaudo total" value={money(revenue)} detail={periodLabel} tone="dark" />
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

      <section className="card">
        <header className="card-head card-head-wrap">
          <div>
            <h3>Movimiento del período</h3>
            <p className="card-subtitle">Los rangos largos se agrupan por mes.</p>
          </div>
          <Badge tone="neutral">{periodLabel}</Badge>
        </header>

        {series.length === 0 ? (
          <p className="empty-state">Sin datos para graficar.</p>
        ) : (
          <div className="chart">
            {series.map((point, index) => (
              <div className="chart-col" key={point.key} title={`${point.label}: ${money(point.total)}`}>
                <div className="chart-track">
                  <div
                    className={`chart-bar${point.total === 0 ? ' empty' : ''}`}
                    style={{ height: `${point.total === 0 ? 0 : Math.max(4, (point.total / max) * 100)}%` }}
                  />
                </div>
                <span className="chart-label">
                  {index % labelStep === 0 || index === series.length - 1 ? point.label : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <h3>Recaudo por concepto</h3>
          </header>
          <div className="revenue-row">
            <span>Sesiones</span>
            <strong>{money(data?.sessions.total ?? 0)}</strong>
          </div>
          <div className="revenue-row">
            <span>Mensualidades</span>
            <strong>{money(data?.memberships.total ?? 0)}</strong>
          </div>
          <div className="revenue-row">
            <span>Inventario</span>
            <strong>{money(data?.inventory.total ?? 0)}</strong>
          </div>
          <hr className="divider" />
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
        </section>

        <section className="card">
          <header className="card-head">
            <h3>Inventario vendido</h3>
            <Badge tone="neutral">{data?.inventory.units ?? 0} unidades</Badge>
          </header>
          {data && data.inventory.items.length > 0 ? (
            <div className="table-wrap">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="num">Unidades</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.items.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.name}</td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">
                        <strong>{money(item.total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">Sin ventas de inventario en el período.</p>
          )}
        </section>
      </div>
    </div>
  )
}
