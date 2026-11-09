# Arquitectura

## Vista general

```text
┌─────────────────────────────────────────────────────────────┐
│ Renderer (React + Vite)                                     │
│  pages/ · components/ · hooks.ts                             │
│  window.rutina.<dominio>.<acción>()                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ contextBridge (preload)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Preload                                                     │
│  invoke(channel) → ipcRenderer.invoke                       │
│  Desempaqueta { ok, data } | { ok, error }                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC tipado (shared/api.ts)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Electron main (backend)                                     │
│  ipc.ts → services/ (reglas de negocio y validación)        │
│         → repositories/ (SQL + mapeo a DTO)                 │
│         → database.ts / migrations.ts (SQLite)              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    data/rutinafit.db
```

## Principios

1. **Dirección única de dependencias**
   - `shared/` no importa Electron, Node ni React.
   - `src/` (renderer) solo importa `shared/` y `window.rutina`.
   - `electron/backend` importa `shared/`; nunca importa `src/`.
   - `electron/main` compone el backend y la ventana.

2. **Contrato tipado**
   - `shared/types.ts` define DTOs y entradas.
   - `shared/api.ts` define `RutinaApi` y los nombres de canal IPC.
   - El preload implementa exactamente esa interfaz; el renderer la consume.

3. **Validación en la frontera**
   - Todo payload que llega por IPC se trata como no confiable.
   - `validation.ts` valida enteros, textos, IDs y fechas.
   - `range.ts` valida rangos y normaliza el reparto efectivo/transferencia.
   - Los errores de validación (`ValidationError`) llegan al usuario con un mensaje legible.

4. **SQL aislado**
   - Ningún servicio escribe SQL.
   - Los repositorios preparan sentencias, mapean `snake_case` a DTOs y usan placeholders para listas `IN`.
   - Las operaciones masivas reciben IDs ya validados y deduplicados.

5. **Respuestas uniformes**
   - `ipc.ts` envuelve cada handler y devuelve `{ ok: true, data }` o `{ ok: false, error }`.
   - El preload convierte el error en `Error` y el renderer lo muestra en un toast.
   - Nunca se expone el stack al renderer.

6. **Seguridad de Electron**
   - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (necesario para el preload compilado).
   - Navegación externa limitada a `https://` y abierta con `shell.openExternal`.
   - El renderer no tiene acceso a `fs`, `better-sqlite3` ni variables de entorno.

## Flujo de una operación

Ejemplo: registrar una sesión.

1. `SessionsPage` construye `SessionInput` y llama `window.rutina.sessions.create(input)`.
2. El preload invoca `sessions:create` y espera la respuesta uniforme.
3. `ipc.ts` llama `createSession(input)`.
4. El servicio valida el monto, el medio de pago y el reparto; si el nombre está vacío genera `Sesión N` contando las del día.
5. El repositorio inserta y devuelve el registro mapeado.
6. La respuesta vuelve al renderer, se muestra un toast y se recarga la tabla.

## Flujo de métricas

`metrics.service`:

1. Resuelve el rango local (`today`, `week`, `month`, `year`, `custom`).
2. Consulta totales de las tres fuentes: sesiones, mensualidades y ventas.
3. Agrupa los movimientos crudos por día o por mes (rangos mayores a 62 días) para la serie.
4. Devuelve `Summary` con conteos, totales, split efectivo/transferencia y desglose de inventario.

El mismo `Summary` alimenta el panel, la pantalla de métricas y el mensaje de WhatsApp, evitando cálculos duplicados.

## Respaldos

- `createBackup` usa `db.backup(destino)` de better-sqlite3: es consistente incluso con WAL activo.
- `ensureMonthlyBackup` se dispara al arrancar en segundo plano, sin bloquear la ventana.
- La exportación manual abre un diálogo nativo y escribe de forma asíncrona.
- La lista de copias se obtiene del sistema de archivos, no de la base.

## Frontend

- Sin router externo: navegación por estado en `App.tsx` (seis pantallas).
- `useData` centraliza carga, error, cancelación y recarga.
- `useSelection` implementa selección múltiple para exportar/eliminar.
- `PaymentFields` reutiliza el mismo formulario híbrido en sesiones, mensualidades e inventario.
- `RangeBar` comparte presets y rango personalizado entre tablas y métricas.
- El CSS usa variables y no depende de frameworks de UI.

## Cómo extender

- **Nueva tabla**: agregar una migración nueva (no modificar la anterior), un repositorio, un servicio y un canal IPC.
- **Nuevo campo**: migración → tipo en `shared/types.ts` → repositorio → servicio → formulario.
- **Nuevo reporte**: reutilizar `getSummary` o crear una consulta agregada en `metrics.repo.ts`.
- **Otra integración**: crear un servicio en `backend/services` y exponerlo por IPC; nunca llamar APIs externas desde el renderer.
