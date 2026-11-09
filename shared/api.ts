import type {
  AppInfo,
  BackupFile,
  Membership,
  MembershipInput,
  Product,
  ProductInput,
  ProductSale,
  ProductSaleInput,
  RangeQuery,
  Session,
  SessionInput,
  Summary,
  WhatsAppConfig,
  WhatsAppPreview,
  WhatsAppSendResult
} from './types'

/**
 * Nombres de canales IPC. Centralizados para evitar strings mágicos
 * y mantener el contrato entre preload, main y renderer.
 */
export const IPC = {
  sessionsList: 'sessions:list',
  sessionsCreate: 'sessions:create',
  sessionsUpdate: 'sessions:update',
  sessionsRemove: 'sessions:remove',
  sessionsExport: 'sessions:export',

  membershipsList: 'memberships:list',
  membershipsCreate: 'memberships:create',
  membershipsUpdate: 'memberships:update',
  membershipsRemove: 'memberships:remove',
  membershipsExport: 'memberships:export',

  productsList: 'inventory:products',
  productsSave: 'inventory:save-product',
  salesList: 'inventory:sales',
  salesCreate: 'inventory:create-sale',
  salesRemove: 'inventory:remove-sales',
  salesExport: 'inventory:export-sales',

  metricsSummary: 'metrics:summary',

  whatsappConfigGet: 'whatsapp:get-config',
  whatsappConfigSave: 'whatsapp:save-config',
  whatsappPreview: 'whatsapp:preview',
  whatsappSend: 'whatsapp:send',
  whatsappOpenChat: 'whatsapp:open-chat',

  backupsCreate: 'backups:create',
  backupsExportDatabase: 'backups:export-database',
  backupsList: 'backups:list',
  backupsOpenFolder: 'backups:open-folder',
  backupsInfo: 'backups:info'
} as const

/** Superficie completa que el renderer puede consumir. */
export interface RutinaApi {
  sessions: {
    list(range: RangeQuery): Promise<Session[]>
    create(input: SessionInput): Promise<Session>
    update(id: number, input: SessionInput): Promise<Session>
    remove(ids: number[]): Promise<number>
    exportCsv(ids: number[]): Promise<string | null>
  }
  memberships: {
    list(range: RangeQuery): Promise<Membership[]>
    create(input: MembershipInput): Promise<Membership>
    update(id: number, input: MembershipInput): Promise<Membership>
    remove(ids: number[]): Promise<number>
    exportCsv(ids: number[]): Promise<string | null>
  }
  inventory: {
    products(): Promise<Product[]>
    saveProduct(input: ProductInput, id?: number): Promise<Product>
    sales(range: RangeQuery): Promise<ProductSale[]>
    createSale(input: ProductSaleInput): Promise<ProductSale>
    removeSales(ids: number[]): Promise<number>
    exportSalesCsv(ids: number[]): Promise<string | null>
  }
  metrics: {
    summary(range: RangeQuery): Promise<Summary>
  }
  whatsapp: {
    getConfig(): Promise<WhatsAppConfig>
    saveConfig(config: WhatsAppConfig): Promise<WhatsAppConfig>
    preview(range: RangeQuery): Promise<WhatsAppPreview>
    send(range: RangeQuery): Promise<WhatsAppSendResult>
    openChat(text: string): Promise<void>
  }
  backups: {
    create(): Promise<BackupFile>
    exportDatabase(): Promise<string | null>
    list(): Promise<BackupFile[]>
    openFolder(): Promise<void>
    info(): Promise<AppInfo>
  }
}
