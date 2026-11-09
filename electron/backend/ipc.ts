import { ipcMain } from 'electron'
import { IPC } from '../../shared/api'
import {
  createMembership,
  exportMemberships,
  listMemberships,
  removeMemberships,
  updateMembership
} from './services/memberships.service'
import {
  createSale,
  exportSales,
  listProducts,
  listSales,
  removeSales,
  saveProduct
} from './services/inventory.service'
import { getSummary } from './services/metrics.service'
import { createSession, exportSessions, listSessions, removeSessions, updateSession } from './services/sessions.service'
import {
  getWhatsAppConfig,
  openWhatsAppChat,
  previewWhatsApp,
  saveWhatsAppConfig,
  sendWhatsApp
} from './services/whatsapp.service'
import {
  createBackup,
  exportDatabase,
  getAppInfo,
  listBackups,
  openBackupsFolder
} from './services/backup.service'

type IpcResult = { ok: true; data: unknown } | { ok: false; error: string }

/**
 * Envuelve un handler para no filtrar stacks al renderer y mantener
 * una única forma de respuesta: { ok, data } | { ok, error }.
 */
function handle(channel: string, handler: (...args: any[]) => unknown | Promise<unknown>): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResult> => {
    try {
      return { ok: true, data: await handler(...args) }
    } catch (error) {
      console.error(`[IPC] ${channel}:`, error)
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Ocurrió un error inesperado'
      }
    }
  })
}

/** Registra todos los canales IPC. Se llama una sola vez al arrancar el main. */
export function registerIpcHandlers(): void {
  handle(IPC.sessionsList, listSessions)
  handle(IPC.sessionsCreate, createSession)
  handle(IPC.sessionsUpdate, updateSession)
  handle(IPC.sessionsRemove, removeSessions)
  handle(IPC.sessionsExport, exportSessions)

  handle(IPC.membershipsList, listMemberships)
  handle(IPC.membershipsCreate, createMembership)
  handle(IPC.membershipsUpdate, updateMembership)
  handle(IPC.membershipsRemove, removeMemberships)
  handle(IPC.membershipsExport, exportMemberships)

  handle(IPC.productsList, listProducts)
  handle(IPC.productsSave, saveProduct)
  handle(IPC.salesList, listSales)
  handle(IPC.salesCreate, createSale)
  handle(IPC.salesRemove, removeSales)
  handle(IPC.salesExport, exportSales)

  handle(IPC.metricsSummary, getSummary)

  handle(IPC.whatsappConfigGet, getWhatsAppConfig)
  handle(IPC.whatsappConfigSave, saveWhatsAppConfig)
  handle(IPC.whatsappPreview, previewWhatsApp)
  handle(IPC.whatsappSend, sendWhatsApp)
  handle(IPC.whatsappOpenChat, openWhatsAppChat)

  handle(IPC.backupsCreate, createBackup)
  handle(IPC.backupsExportDatabase, exportDatabase)
  handle(IPC.backupsList, listBackups)
  handle(IPC.backupsOpenFolder, openBackupsFolder)
  handle(IPC.backupsInfo, getAppInfo)
}
