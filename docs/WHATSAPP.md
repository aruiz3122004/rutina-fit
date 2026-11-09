# WhatsApp

## Modos de envío

| Modo | Requisitos | Resultado |
| --- | --- | --- |
| **Cloud API** | `ownerPhone`, `phoneNumberId`, `token` | Envío automático desde el número de WhatsApp Business. |
| **Enlace manual** | `ownerPhone` | Abre WhatsApp Web con el resumen precargado. |

La vista previa se genera siempre, incluso sin credenciales.

## Configurar Meta Cloud API

1. Crear una app en [Meta for Developers](https://developers.facebook.com/).
2. Agregar el producto **WhatsApp**.
3. En *API Setup* copiar:
   - **Phone Number ID** (no es el número de teléfono).
   - **Temporary access token** para pruebas o un token permanente de un usuario del sistema.
4. Guardar esos valores en **Respaldos → WhatsApp del dueño**.
5. Escribir el número del dueño:
   - Celular colombiano de 10 dígitos (`3001234567`) → se normaliza a `573001234567`.
   - O directamente formato internacional (`573001234567`).
6. Pulsar **Enviar prueba**.

> El número de destino debe poder recibir mensajes de la cuenta de WhatsApp Business. En modo de prueba, Meta solo permite números verificados.

## Variables de entorno

| Variable | Uso | Default |
| --- | --- | --- |
| `WHATSAPP_TOKEN` | Token de Cloud API sin guardarlo en SQLite. Tiene prioridad solo si no hay token guardado. | — |
| `WHATSAPP_API_VERSION` | Versión de Graph API. | `v23.0` |

Ejemplo en PowerShell:

```powershell
$env:WHATSAPP_TOKEN="EAAG..."
$env:WHATSAPP_API_VERSION="v23.0"
npm run dev
```

## Formato del mensaje

```text
*Rutina Fit — Resumen del día*
Lunes, 9 de noviembre de 2026

Sesiones: 12 · $48.000
Mensualidades: 2 · $120.000
Inventario: 3 · $21.000
  • Energy: $12.000
  • Agua: $9.000

*Recaudo total: $189.000*
Efectivo: $80.000
Transferencias: $109.000
```

Se construye en `electron/backend/services/reports.service.ts` a partir del `Summary` de métricas. El texto es el mismo para la vista previa, el enlace `wa.me` y Cloud API.

## Implementación

- `GET /{version}/{phoneNumberId}/messages` con `Authorization: Bearer <token>`.
- Cuerpo `{ messaging_product: "whatsapp", to, type: "text", text: { body } }`.
- Timeout de 15 s con `AbortSignal.timeout`.
- Si Meta responde con error, se propaga `error.message` al toast de la interfaz.
- Si faltan credenciales, la respuesta incluye `sent: false`, el motivo y el enlace manual.

## Seguridad

- El token se guarda en la tabla `settings` de la base local. Para evitar persistirlo, usar `WHATSAPP_TOKEN`.
- El renderer nunca ve el token: la configuración solo se solicita/edita desde la pantalla de respaldos a través de IPC.
- No se envían datos a terceros aparte de Meta cuando se usa Cloud API.
- Si se filtra un token, revocarlo en Meta Business Suite y generar uno nuevo.

## Solución de problemas

| Síntoma | Causa probable |
| --- | --- |
| `sent: false` con “Configura…” | Faltan número, Phone Number ID o token. |
| Error 401/403 | Token vencido o sin permisos. |
| Error 400 `Recipient phone number not in allowed list` | Número no verificado en modo de prueba. |
| Error de red/timeout | Sin conexión o endpoint/versión incorrectos. |
| El enlace `wa.me` no abre | Navegador predeterminado no disponible; abrir manualmente la URL. |
