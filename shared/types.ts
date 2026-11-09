/**
 * Contratos compartidos entre backend (Electron main) y frontend (React).
 * Son tipos puros: no contienen lógica ni dependencias de Node/DOM.
 */

export type PaymentMethod = 'cash' | 'nequi' | 'daviplata' | 'bancolombia' | 'hybrid'

export type RangePreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface RangeQuery {
  preset: RangePreset
  /** Solo para preset "custom". Marca el inicio del rango (mismo día local). */
  start?: number
  /** Solo para preset "custom". Marca el último día incluido (día local). */
  end?: number
}

export interface ResolvedRange {
  preset: RangePreset
  /** Inicio inclusivo, epoch en milisegundos. */
  start: number
  /** Fin exclusivo, epoch en milisegundos. */
  end: number
}

export interface MoneyTotals {
  total: number
  cash: number
  transfer: number
}

export interface Session {
  id: number
  name: string
  amount: number
  paymentMethod: PaymentMethod
  cashAmount: number
  transferAmount: number
  createdAt: number
}

export interface SessionInput {
  name?: string
  amount: number
  paymentMethod: PaymentMethod
  cashAmount?: number
  transferAmount?: number
  /** Opcional para registrar movimientos históricos. Por defecto: ahora. */
  createdAt?: number
}

export interface Membership {
  id: number
  customerName: string
  durationDays: number
  price: number
  paymentMethod: PaymentMethod
  cashAmount: number
  transferAmount: number
  createdAt: number
  /** Fecha de vencimiento calculada (createdAt + duración). */
  expiresAt: number
}

export interface MembershipInput {
  customerName: string
  durationDays?: number
  price: number
  paymentMethod: PaymentMethod
  cashAmount?: number
  transferAmount?: number
  createdAt?: number
}

export interface Product {
  id: number
  name: string
  price: number
  active: boolean
  createdAt: number
}

export interface ProductInput {
  name: string
  price: number
  active?: boolean
}

export interface ProductSale {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  amount: number
  paymentMethod: PaymentMethod
  cashAmount: number
  transferAmount: number
  createdAt: number
}

export interface ProductSaleInput {
  productId: number
  quantity: number
  /** Si se omite se usa el precio actual del producto. */
  unitPrice?: number
  paymentMethod: PaymentMethod
  cashAmount?: number
  transferAmount?: number
  createdAt?: number
}

export interface InventoryItemSummary {
  productId: number
  name: string
  quantity: number
  total: number
}

export interface SeriesPoint {
  key: string
  label: string
  sessions: number
  memberships: number
  inventory: number
  total: number
}

export interface Summary {
  range: ResolvedRange
  sessions: MoneyTotals & { count: number }
  memberships: MoneyTotals & { count: number }
  inventory: MoneyTotals & { units: number; items: InventoryItemSummary[] }
  revenue: MoneyTotals
  /** Serie temporal agregada según la duración del rango. */
  series: SeriesPoint[]
}

export interface BackupFile {
  filename: string
  path: string
  size: number
  createdAt: number
}

export interface AppInfo {
  version: string
  databasePath: string
  backupsDir: string
  isPackaged: boolean
}

export interface WhatsAppConfig {
  businessName: string
  /** Número del dueño en formato internacional, solo dígitos. Ej: 573001234567. */
  ownerPhone: string
  /** Phone Number ID de Meta Cloud API. */
  phoneNumberId: string
  /** Token de acceso de Meta Cloud API. También puede venir de WHATSAPP_TOKEN. */
  token: string
}

export interface WhatsAppPreview {
  text: string
  waLink: string
  configured: boolean
}

export interface WhatsAppSendResult extends WhatsAppPreview {
  sent: boolean
  reason?: string
}
