import { shell } from 'electron'
import { APP_NAME } from '../../../shared/constants'
import type { WhatsAppConfig, WhatsAppPreview, WhatsAppSendResult } from '../../../shared/types'
import { settingsRepo } from '../repositories/settings.repo'
import { optionalText, record, text, ValidationError } from '../validation'
import { getSummary } from './metrics.service'
import { whatsappMessage } from './reports.service'

const SETTINGS_KEY = 'whatsapp'
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v23.0'

const DEFAULT_CONFIG: WhatsAppConfig = {
  businessName: APP_NAME,
  ownerPhone: '',
  phoneNumberId: '',
  token: ''
}

/**
 * Normaliza el número: quita separadores y antepone 57 a los celulares
 * colombianos de 10 dígitos. Meta exige formato internacional sin "+".
 */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `57${digits}` : digits
}

function waLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const stored = settingsRepo.get<Partial<WhatsAppConfig>>(SETTINGS_KEY) ?? {}
  return {
    businessName: stored.businessName || DEFAULT_CONFIG.businessName,
    ownerPhone: stored.ownerPhone || DEFAULT_CONFIG.ownerPhone,
    phoneNumberId: stored.phoneNumberId || DEFAULT_CONFIG.phoneNumberId,
    token: stored.token || process.env.WHATSAPP_TOKEN || DEFAULT_CONFIG.token
  }
}

export function saveWhatsAppConfig(value: unknown): WhatsAppConfig {
  const input = record(value)
  const ownerPhone = normalizePhone(optionalText(input.ownerPhone, 30))
  if (ownerPhone && (ownerPhone.length < 10 || ownerPhone.length > 15)) {
    throw new ValidationError('El número del dueño debe incluir el indicativo del país')
  }

  const config: WhatsAppConfig = {
    businessName: optionalText(input.businessName, 60) || APP_NAME,
    ownerPhone,
    phoneNumberId: optionalText(input.phoneNumberId, 40),
    token: optionalText(input.token, 500)
  }

  settingsRepo.set(SETTINGS_KEY, config)
  return getWhatsAppConfig()
}

function buildPreview(rangeInput: unknown): { config: WhatsAppConfig; preview: WhatsAppPreview } {
  const config = getWhatsAppConfig()
  const message = whatsappMessage(getSummary(rangeInput), config.businessName)
  const configured = Boolean(config.ownerPhone && config.phoneNumberId && config.token)

  return {
    config,
    preview: {
      text: message,
      waLink: config.ownerPhone ? waLink(config.ownerPhone, message) : '',
      configured
    }
  }
}

export function previewWhatsApp(range: unknown): WhatsAppPreview {
  return buildPreview(range).preview
}

/**
 * Envía el resumen por Meta WhatsApp Cloud API.
 * Si no hay credenciales, devuelve el texto y el enlace wa.me para uso manual.
 */
export async function sendWhatsApp(range: unknown): Promise<WhatsAppSendResult> {
  const { config, preview } = buildPreview(range)

  if (!config.ownerPhone) {
    return { ...preview, sent: false, reason: 'Configura el número de WhatsApp del dueño' }
  }
  if (!config.phoneNumberId || !config.token) {
    return {
      ...preview,
      sent: false,
      reason: 'Configura el Phone Number ID y el token de Meta Cloud API, o usa el enlace de WhatsApp Web'
    }
  }

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: config.ownerPhone,
        type: 'text',
        text: { preview_url: false, body: preview.text }
      }),
      signal: AbortSignal.timeout(15_000)
    }
  )

  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `WhatsApp respondió con error ${response.status}`)
  }

  return { ...preview, sent: true }
}

export async function openWhatsAppChat(value: unknown): Promise<void> {
  const message = text(value, 'El mensaje', 4_000)
  const { ownerPhone } = getWhatsAppConfig()
  if (!ownerPhone) throw new ValidationError('Configura el número de WhatsApp del dueño')
  await shell.openExternal(waLink(ownerPhone, message))
}
