import type { ReactNode } from 'react'

export function Kpi({
  label,
  value,
  detail,
  tone = 'plain'
}: {
  label: string
  value: string
  detail?: string
  tone?: 'plain' | 'brand' | 'dark'
}) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {detail && <span className="kpi-detail">{detail}</span>}
    </article>
  )
}

export function Field({
  label,
  children,
  hint,
  span = false
}: {
  label: string
  children: ReactNode
  hint?: string
  span?: boolean
}) {
  return (
    <label className={`field${span ? ' span-2' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'ok' | 'neutral' | 'warn' | 'danger' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function SelectionBar({
  count,
  onClear,
  onExport,
  onDelete
}: {
  count: number
  onClear: () => void
  onExport: () => void
  onDelete: () => void
}) {
  if (count === 0) return null
  return (
    <div className="selection-bar">
      <span>{count} seleccionado{count === 1 ? '' : 's'}</span>
      <div className="selection-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExport}>
          Exportar CSV
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
          Eliminar
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Limpiar
        </button>
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>
}
