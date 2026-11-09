import { app } from 'electron'
import { isAbsolute, join, resolve } from 'node:path'

/**
 * Rutas de datos. En desarrollo se usan carpetas visibles dentro del proyecto;
 * en la app empaquetada se usa el directorio de usuario de Electron.
 * Se pueden sobreescribir con RUTINA_DATA_DIR y RUTINA_BACKUPS_DIR.
 */
export function getPaths() {
  const root = app.isPackaged ? app.getPath('userData') : app.getAppPath()
  const dataDir = process.env.RUTINA_DATA_DIR ?? join(root, 'data')
  const backupsDir = process.env.RUTINA_BACKUPS_DIR ?? join(root, 'backups')

  return {
    dataDir: isAbsolute(dataDir) ? dataDir : resolve(dataDir),
    backupsDir: isAbsolute(backupsDir) ? backupsDir : resolve(backupsDir)
  }
}
