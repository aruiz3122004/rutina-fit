import { app, BrowserWindow, dialog } from 'electron'
import { closeDatabase, initDatabase } from '../backend/database'
import { registerIpcHandlers } from '../backend/ipc'
import { ensureMonthlyBackup } from '../backend/services/backup.service'
import { createMainWindow } from './window'

app.setAppUserModelId('com.rutinafit.app')

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0]
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })

  app.whenReady().then(() => {
    try {
      initDatabase()
      registerIpcHandlers()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dialog.showErrorBox('No se pudo iniciar Rutina Fit', `Revisa la base de datos local.\n\n${message}`)
      app.quit()
      return
    }

    createMainWindow()

    // El respaldo mensual corre en segundo plano: no bloquea la apertura.
    void ensureMonthlyBackup().catch((error) => console.error('[backup] Error en copia mensual:', error))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', closeDatabase)
}
