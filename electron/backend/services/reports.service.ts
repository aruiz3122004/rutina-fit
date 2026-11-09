import { DAY_MS } from '../../../shared/dates'
import { formatDate, formatLongDate, money } from '../../../shared/format'
import type { Summary } from '../../../shared/types'

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function heading(summary: Summary): { title: string; period: string } {
  const { preset, start, end } = summary.range
  const period =
    preset === 'today'
      ? capitalize(formatLongDate(start))
      : `${formatDate(start)} – ${formatDate(end - DAY_MS)}`

  const titles: Record<Exclude<typeof preset, 'custom'>, string> = {
    today: 'Resumen del día',
    week: 'Resumen de la semana',
    month: 'Resumen del mes',
    year: 'Resumen del año'
  }

  return { title: preset === 'custom' ? 'Resumen del período' : titles[preset], period }
}

/**
 * Convierte el resumen estructurado en el mensaje de WhatsApp.
 * Se usa tanto para el envío por Cloud API como para el enlace wa.me y la vista previa.
 */
export function whatsappMessage(summary: Summary, businessName: string): string {
  const { title, period } = heading(summary)
  const lines = [
    `*${businessName} — ${title}*`,
    period,
    '',
    `Sesiones: ${summary.sessions.count} · ${money(summary.sessions.total)}`,
    `Mensualidades: ${summary.memberships.count} · ${money(summary.memberships.total)}`,
    `Inventario: ${summary.inventory.units} · ${money(summary.inventory.total)}`
  ]

  for (const item of summary.inventory.items) {
    lines.push(`  • ${item.name}: ${money(item.total)}`)
  }

  lines.push(
    '',
    `*Recaudo total: ${money(summary.revenue.total)}*`,
    `Efectivo: ${money(summary.revenue.cash)}`,
    `Transferencias: ${money(summary.revenue.transfer)}`
  )

  return lines.join('\n')
}
