import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type RutinaApi } from '../../shared/api'

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Invoca el backend y convierte la respuesta uniforme en promesa/error limpio. */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!result.ok) throw new Error(result.error)
  return result.data
}

const api: RutinaApi = {
  sessions: {
    list: (range) => invoke(IPC.sessionsList, range),
    create: (input) => invoke(IPC.sessionsCreate, input),
    update: (id, input) => invoke(IPC.sessionsUpdate, id, input),
    remove: (ids) => invoke(IPC.sessionsRemove, ids),
    exportCsv: (ids) => invoke(IPC.sessionsExport, ids)
  },
  memberships: {
    list: (range) => invoke(IPC.membershipsList, range),
    create: (input) => invoke(IPC.membershipsCreate, input),
    update: (id, input) => invoke(IPC.membershipsUpdate, id, input),
    remove: (ids) => invoke(IPC.membershipsRemove, ids),
    exportCsv: (ids) => invoke(IPC.membershipsExport, ids)
  },
  inventory: {
    products: () => invoke(IPC.productsList),
    saveProduct: (input, id) => invoke(IPC.productsSave, input, id),
    sales: (range) => invoke(IPC.salesList, range),
    createSale: (input) => invoke(IPC.salesCreate, input),
    removeSales: (ids) => invoke(IPC.salesRemove, ids),
    exportSalesCsv: (ids) => invoke(IPC.salesExport, ids)
  },
  metrics: {
    summary: (range) => invoke(IPC.metricsSummary, range)
  },
  whatsapp: {
    getConfig: () => invoke(IPC.whatsappConfigGet),
    saveConfig: (config) => invoke(IPC.whatsappConfigSave, config),
    preview: (range) => invoke(IPC.whatsappPreview, range),
    send: (range) => invoke(IPC.whatsappSend, range),
    openChat: (text) => invoke(IPC.whatsappOpenChat, text)
  },
  backups: {
    create: () => invoke(IPC.backupsCreate),
    exportDatabase: () => invoke(IPC.backupsExportDatabase),
    list: () => invoke(IPC.backupsList),
    openFolder: () => invoke(IPC.backupsOpenFolder),
    info: () => invoke(IPC.backupsInfo)
  }
}

contextBridge.exposeInMainWorld('rutina', api)
