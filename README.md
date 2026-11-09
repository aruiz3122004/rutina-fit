# Rutina Fit

Aplicación local de escritorio para la recepción de un gimnasio. Registra sesiones, mensualidades y ventas de inventario, calcula métricas, genera respaldos de SQLite y envía el resumen diario al dueño por WhatsApp.

## Stack

- **Electron 45** — aplicación de escritorio y proceso principal (backend).
- **React 19 + Vite 7** — interfaz (frontend).
- **TypeScript** — contratos y tipado de punta a punta.
- **better-sqlite3 13** — base de datos local (binario N-API precompilado, no requiere Visual Studio).
- **WhatsApp Cloud API** — envío automático; enlace `wa.me` como alternativa manual.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- Windows (el empaquetador está configurado para Windows; el código es multiplataforma).

No se necesita Visual Studio ni compiladores: `better-sqlite3` 13 incluye binarios precompilados compatibles con Electron.

## Puesta en marcha

```bash
npm install
npm run dev
```

Scripts disponibles:

| Script | Uso |
| --- | --- |
| `npm run dev` | Desarrollo con recarga en caliente. |
| `npm run typecheck` | Verifica TypeScript (main, preload, renderer y shared). |
| `npm run build` | Typecheck + compilación a `out/`. |
| `npm start` | Ejecuta la versión compilada. |
| `npm run package` | Genera el instalador NSIS en `release/`. |

## Dónde se guardan los datos

| Entorno | Base de datos | Respaldos |
| --- | --- | --- |
| Desarrollo (`npm run dev`) | `./data/rutinafit.db` | `./backups/` |
| App instalada | `%APPDATA%\rutina-fit\data\rutinafit.db` | `%APPDATA%\rutina-fit\backups\` |

Se pueden sobreescribir con:

```powershell
$env:RUTINA_DATA_DIR="D:\RutinaFit\data"
$env:RUTINA_BACKUPS_DIR="D:\RutinaFit\backups"
```

La app crea automáticamente una copia mensual (`rutinafit-AAAA-MM.db`) al arrancar. Conserva las últimas 12 copias mensuales; las copias manuales no se borran solas. Desde **Respaldos** también se puede:

- Crear una copia inmediata.
- Exportar la base completa a un archivo `.db` que el usuario elija.
- Abrir la carpeta de respaldos.

## WhatsApp

1. Crear una app en [Meta for Developers](https://developers.facebook.com/) con el producto WhatsApp.
2. Obtener el **Phone Number ID** y un **token de acceso**.
3. En **Respaldos → WhatsApp del dueño**, guardar el número (celular colombiano de 10 dígitos o formato internacional), el Phone Number ID y el token.
4. Probar con **Enviar prueba**.

Si no hay credenciales, el resumen se puede enviar abriendo WhatsApp Web con el texto precargado. El token también se puede definir con `WHATSAPP_TOKEN` para no guardarlo en la base. Ver [`docs/WHATSAPP.md`](docs/WHATSAPP.md).

## Estructura

```text
electron/
  main/                 Ciclo de vida de Electron y ventana
  preload/              Puente seguro (contextBridge)
  backend/
    database.ts         Conexión SQLite y PRAGMAs
    migrations.ts       Esquema versionado
    ipc.ts              Registro de canales IPC
    validation.ts       Validación y normalización de entrada
    range.ts            Rangos de fecha y reparto de pagos
    repositories/       Todo el SQL (una capa aislada)
    services/           Reglas de negocio, respaldos, WhatsApp y CSV
shared/                 Contratos y utilidades puras compartidas
src/
  components/           UI reutilizable
  pages/                Pantallas
  hooks.ts              Carga asíncrona y selección de tablas
docs/                   Arquitectura, base de datos y WhatsApp
```

El detalle de capas está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y el esquema en [`docs/DATABASE.md`](docs/DATABASE.md).

## Decisiones relevantes

- **Aislamiento de Electron**: `contextIsolation: true`, `nodeIntegration: false` y una única API tipada expuesta en `window.rutina`.
- **Separación estricta**: el renderer no conoce SQLite ni Node; el backend no conoce React.
- **Dinero en enteros**: los valores se guardan en pesos enteros (sin decimales) para evitar errores de punto flotante. Se aceptan pagos híbridos con reparto efectivo/transferencia.
- **Fechas en epoch ms**: se almacenan en UTC y se agrupan en la zona horaria local del equipo.
- **Migraciones incrementales**: `PRAGMA user_version`; nunca se edita una migración publicada.
- **Exportaciones asíncronas**: los CSV y respaldos usan `dialog` + API asíncrona, sin bloquear la ventana.

## Alcance actual

- Un único rol (administrador/recepción), sin autenticación.
- Sin sincronización en la nube: los respaldos se copian manualmente a USB/Drive.
- La interfaz está pensada para escritorio y se adapta a pantallas pequeñas de forma básica.
