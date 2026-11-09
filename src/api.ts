import type { RutinaApi } from '../shared/api'

/** Única puerta del frontend hacia el backend. No hay acceso directo a Node/SQLite. */
export const api: RutinaApi = window.rutina
