/**
 * Versioned SQLite schema. NEVER edit a published migration: append a new one.
 * The current version is stored in `PRAGMA user_version`.
 */
export interface SqlMigration {
  version: number;
  description: string;
  statements: readonly string[];
}

export const SQLITE_MIGRATIONS: readonly SqlMigration[] = [
  {
    version: 1,
    description: 'Initial schema',
    statements: [
      `CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        need INTEGER NOT NULL
      )`,
      `CREATE TABLE rules (
        id TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('inc', 'exp')),
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id TEXT,
        day INTEGER NOT NULL,
        every INTEGER NOT NULL,
        anchor TEXT NOT NULL,
        from_month TEXT,
        to_month TEXT,
        note TEXT NOT NULL,
        active INTEGER NOT NULL,
        subscription INTEGER NOT NULL
      )`,
      `CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('inc', 'exp')),
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id TEXT,
        date TEXT NOT NULL,
        note TEXT NOT NULL
      )`,
      'CREATE INDEX transactions_date ON transactions (date)',
      `CREATE TABLE savings_accounts (
        id TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL,
        product TEXT NOT NULL,
        name TEXT NOT NULL,
        bank TEXT NOT NULL,
        balance INTEGER NOT NULL,
        balance_date TEXT NOT NULL,
        custom_rate REAL,
        rate_checked_on TEXT,
        opened_on TEXT
      )`,
      `CREATE TABLE savings_movements (
        account_id TEXT NOT NULL REFERENCES savings_accounts (id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount INTEGER NOT NULL,
        PRIMARY KEY (account_id, id)
      )`,
      `CREATE TABLE goals (
        id TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        target INTEGER NOT NULL,
        saved INTEGER NOT NULL
      )`,
      'CREATE TABLE occurrence_marks (key TEXT PRIMARY KEY NOT NULL, included INTEGER NOT NULL)',
      'CREATE TABLE occurrence_paid (key TEXT PRIMARY KEY NOT NULL)',
      `CREATE TABLE settings (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        schema_version INTEGER NOT NULL,
        balance INTEGER NOT NULL,
        balance_date TEXT NOT NULL,
        buffer INTEGER NOT NULL,
        sim_alt_rate REAL,
        last_backup_at TEXT
      )`,
      `CREATE TABLE snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL
      )`,
    ],
  },
];

export const LATEST_SQLITE_VERSION = SQLITE_MIGRATIONS.reduce((v, m) => Math.max(v, m.version), 0);
