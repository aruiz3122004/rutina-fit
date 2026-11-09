# Base de datos

Motor: **SQLite 3** mediante `better-sqlite3`. Archivo: `data/rutinafit.db` (desarrollo) o el directorio de usuario en la app instalada.

Configuración de conexión:

```sql
PRAGMA journal_mode = WAL;      -- lecturas concurrentes y mejor resistencia
PRAGMA synchronous = NORMAL;    -- buen equilibrio seguridad/rendimiento
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

## Diagrama

```text
products 1 ──── * product_sales
sessions          (independiente)
memberships       (independiente)
settings          (clave/valor JSON)
```

## Tablas

### `sessions`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | INTEGER | PK autoincremental |
| `name` | TEXT | Obligatorio; por defecto `Sesión N` |
| `amount` | INTEGER | > 0; total pagado |
| `payment_method` | TEXT | `cash`, `nequi`, `daviplata`, `bancolombia`, `hybrid` |
| `cash_amount` | INTEGER | >= 0 |
| `transfer_amount` | INTEGER | >= 0 |
| `created_at` | INTEGER | epoch ms |
| `updated_at` | INTEGER | epoch ms |

Restricción clave: `cash_amount + transfer_amount = amount`.

### `memberships`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | INTEGER | PK |
| `customer_name` | TEXT | Obligatorio |
| `duration_days` | INTEGER | > 0; por defecto 30 |
| `price` | INTEGER | > 0; por defecto 60.000 |
| `payment_method` | TEXT | Mismo enum que sesiones |
| `cash_amount` / `transfer_amount` | INTEGER | Suma igual a `price` |
| `created_at` / `updated_at` | INTEGER | epoch ms |

`expires_at` **no se almacena**: se calcula como `created_at + duration_days * 86.400.000`.

### `products`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | INTEGER | PK |
| `name` | TEXT | Único, sin distinguir mayúsculas en la validación |
| `price` | INTEGER | >= 0; precio actual sugerido |
| `active` | INTEGER | 0/1; los inactivos no se ofrecen al vender |
| `created_at` | INTEGER | epoch ms |

Se siembran cinco productos editables: Agua, Energy, Creatina, Proteína y Aminoácidos.

### `product_sales`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | INTEGER | PK |
| `product_id` | INTEGER | FK → `products.id` |
| `quantity` | INTEGER | > 0 |
| `unit_price` | INTEGER | >= 0; se conserva el precio histórico |
| `amount` | INTEGER | `quantity * unit_price` |
| `payment_method` | TEXT | Mismo enum |
| `cash_amount` / `transfer_amount` | INTEGER | Suma igual a `amount` |
| `created_at` | INTEGER | epoch ms |

### `settings`

| Columna | Tipo | Regla |
| --- | --- | --- |
| `key` | TEXT | PK |
| `value` | TEXT | JSON serializado |
| `updated_at` | INTEGER | epoch ms |

Uso actual: `whatsapp` → `{ businessName, ownerPhone, phoneNumberId, token }`.

## Índices

- `sessions(created_at)`
- `memberships(created_at)`
- `product_sales(created_at)`
- `product_sales(product_id)`

## Migraciones

`electron/backend/migrations.ts` contiene un arreglo ordenado. Al abrir la base se lee `PRAGMA user_version` y se ejecutan solo las migraciones pendientes, cada una en una transacción.

Regla de oro: **una migración publicada no se modifica**. Cualquier cambio de esquema es una nueva entrada con la versión siguiente.

## Respaldos

El comando `db.backup()` de better-sqlite3 genera una copia consistente aunque la base esté en modo WAL. Los respaldos se guardan en `backups/`:

- `rutinafit-AAAA-MM-DD_HH-mm-ss-SSS.db` — copia manual.
- `rutinafit-AAAA-MM.db` — copia mensual automática (se conservan 12).

## Consideraciones

- **Dinero**: enteros en pesos colombianos; no se usan flotantes ni centavos.
- **Fechas**: epoch en milisegundos; las agrupaciones usan la zona horaria local del equipo.
- **Borrados**: no hay borrado lógico salvo `products.active`. Las ventas conservan su precio histórico.
- **Integridad**: las restricciones `CHECK` de SQLite respaldan las validaciones de la aplicación.
- **Concurrencia**: al ser una app local mono-usuario, WAL + `busy_timeout` es suficiente.
