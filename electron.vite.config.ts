import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * Configuración de compilación en tres mundos separados:
 * - main: proceso principal (backend + SQLite).
 * - preload: puente seguro entre backend y renderer.
 * - renderer: aplicación React (frontend).
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: { input: resolve(__dirname, 'electron/main/index.ts') }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: { input: resolve(__dirname, 'electron/preload/index.ts') }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    plugins: [react()],
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/index.html') }
    }
  }
})
