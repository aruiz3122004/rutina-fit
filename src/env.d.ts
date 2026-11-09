/// <reference types="vite/client" />

import type { RutinaApi } from '../shared/api'

declare global {
  interface Window {
    /** Puente seguro expuesto por electron/preload (contextBridge). */
    rutina: RutinaApi
  }
}

export {}
