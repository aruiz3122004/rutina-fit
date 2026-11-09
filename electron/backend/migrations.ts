import type Database from 'better-sqlite3'

/**
 * Migraciones incrementales controladas por PRAGMA user_version.
 * Para evolucionar el esquema: agregar un objeto nuevo con la versión siguiente.
 * Nunca modificar una migración ya publicada.
 */
const migrations: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE sessions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT    NOT NULL,
        amount          INTEGER NOT NULL CHECK (amount > 0),
        payment_method  TEXT    NOT NULL CHECK (payment_method IN ('cash','nequi','daviplata','bancolombia','hybrid')),
        cash_amount     INTEGER NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
        transfer_amount INTEGER NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0),
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        CHECK (cash_amount + transfer_amount = amount)
      );

      CREATE TABLE memberships (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name   TEXT    NOT NULL,
        duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
        price           INTEGER NOT NULL CHECK (price > 0),
        payment_method  TEXT    NOT NULL CHECK (payment_method IN ('cash','nequi','daviplata','bancolombia','hybrid')),
        cash_amount     INTEGER NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
        transfer_amount INTEGER NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0),
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        CHECK (cash_amount + transfer_amount = price)
      );

      CREATE TABLE products (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL UNIQUE,
        price      INTEGER NOT NULL CHECK (price >= 0),
        active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
        created_at INTEGER NOT NULL
      );

      CREATE TABLE product_sales (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id      INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE,
        quantity        INTEGER NOT NULL CHECK (quantity > 0),
        unit_price      INTEGER NOT NULL CHECK (unit_price >= 0),
        amount          INTEGER NOT NULL CHECK (amount >= 0),
        payment_method  TEXT    NOT NULL CHECK (payment_method IN ('cash','nequi','daviplata','bancolombia','hybrid')),
        cash_amount     INTEGER NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
        transfer_amount INTEGER NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0),
        created_at      INTEGER NOT NULL,
        CHECK (cash_amount + transfer_amount = amount),
        CHECK (amount = quantity * unit_price)
      );

      CREATE TABLE settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX idx_sessions_created_at ON sessions(created_at);
      CREATE INDEX idx_memberships_created_at ON memberships(created_at);
      CREATE INDEX idx_product_sales_created_at ON product_sales(created_at);
      CREATE INDEX idx_product_sales_product ON product_sales(product_id);

      INSERT OR IGNORE INTO products (name, price, active, created_at) VALUES
        ('Agua',        3000, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
        ('Energy',      6000, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
        ('Creatina',    5000, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
        ('Proteína',   12000, 1, CAST(strftime('%s','now') AS INTEGER) * 1000),
        ('Aminoácidos', 5000, 1, CAST(strftime('%s','now') AS INTEGER) * 1000);
    `
  }
]

export function migrate(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number

  for (const migration of migrations) {
    if (migration.version <= current) continue
    db.transaction(() => {
      db.exec(migration.sql)
      db.pragma(`user_version = ${migration.version}`)
    })()
  }
}
