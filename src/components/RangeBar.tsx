import { useState } from 'react'
import { DAY_MS } from '../../shared/dates'
import { toDateInput } from '../../shared/format'
import type { RangePreset, RangeQuery } from '../../shared/types'

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' }
]

/** Filtro compartido por tablas y métricas: presets + rango personalizado. */
export function RangeBar({
  value,
  onChange
}: {
  value: RangeQuery
  onChange: (range: RangeQuery) => void
}) {
  const [from, setFrom] = useState(() => toDateInput(value.start ?? Date.now() - 6 * DAY_MS))
  const [to, setTo] = useState(() => toDateInput(value.end ? value.end - DAY_MS : Date.now()))

  const applyCustom = () => {
    if (!from || !to) return
    onChange({
      preset: 'custom',
      start: new Date(`${from}T00:00:00`).getTime(),
      end: new Date(`${to}T00:00:00`).getTime()
    })
  }

  return (
    <div className="range-bar">
      <div className="segmented">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={value.preset === preset.id ? 'active' : ''}
            onClick={() => onChange({ preset: preset.id })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="range-custom">
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Desde" />
        <span>–</span>
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Hasta" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={applyCustom}>
          Aplicar
        </button>
      </div>
    </div>
  )
}
