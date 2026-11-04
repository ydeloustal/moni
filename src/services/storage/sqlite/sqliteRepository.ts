import type {
  Category,
  Frequency,
  Goal,
  Kind,
  Rule,
  SavingsAccount,
  SavingsProduct,
  Tx,
} from '@/types/domain';
import { NewerStorageError, type BudgetRepository, type ChangeSet } from '../types';
import type { SqlDatabase, SqlExecutor, SqlValue } from './database';
import { LATEST_SQLITE_VERSION, SQLITE_MIGRATIONS, type SqlMigration } from './migrations';

const bool = (v: boolean): number => (v ? 1 : 0);

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  need: number;
}
interface RuleRow {
  id: string;
  kind: Kind;
  name: string;
  amount: number;
  category_id: string | null;
  day: number;
  every: Frequency;
  anchor: string;
  from_month: string | null;
  to_month: string | null;
  note: string;
  active: number;
  subscription: number;
}
interface TxRow {
  id: string;
  kind: Kind;
  name: string;
  amount: number;
  category_id: string | null;
  date: string;
  note: string;
}
interface AccountRow {
  id: string;
  product: SavingsProduct;
  name: string;
  bank: string;
  balance: number;
  balance_date: string;
  custom_rate: number | null;
  rate_checked_on: string | null;
  opened_on: string | null;
}
interface MovementRow {
  account_id: string;
  id: string;
  date: string;
  amount: number;
}
interface SettingsRow {
  schema_version: number;
  balance: number;
  balance_date: string;
  buffer: number;
  sim_alt_rate: number | null;
  last_backup_at: string | null;
}

/** Applies pending migrations, each one in its own transaction. Exported for tests. */
export async function migrate(
  db: SqlDatabase,
  migrations: readonly SqlMigration[] = SQLITE_MIGRATIONS,
): Promise<number> {
  const [row] = await db.all<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  const latest = migrations.reduce((v, m) => Math.max(v, m.version), 0);
  if (current > latest) throw new NewerStorageError();
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (m.version <= current) continue;
    await db.transaction(async tx => {
      for (const sql of m.statements) await tx.exec(sql);
      // PRAGMA does not accept bound parameters; the version is a trusted integer.
      await tx.exec(`PRAGMA user_version = ${Math.trunc(m.version)}`);
    });
  }
  return latest;
}

async function deleteIds(tx: SqlExecutor, table: string, ids: readonly string[], column = 'id') {
  for (const id of ids) await tx.run(`DELETE FROM ${table} WHERE ${column} = ?`, [id]);
}

async function applyChanges(tx: SqlExecutor, c: ChangeSet): Promise<void> {
  if (c.reset) {
    for (const table of [
      'savings_movements',
      'savings_accounts',
      'categories',
      'rules',
      'transactions',
      'goals',
      'occurrence_marks',
      'occurrence_paid',
      'settings',
    ]) {
      await tx.exec(`DELETE FROM ${table}`);
    }
  }

  await deleteIds(tx, 'categories', c.categories.remove);
  for (const { item: x, position } of c.categories.upsert) {
    await tx.run(
      'INSERT OR REPLACE INTO categories (id, position, name, color, need) VALUES (?, ?, ?, ?, ?)',
      [x.id, position, x.name, x.color, bool(x.need)],
    );
  }

  await deleteIds(tx, 'rules', c.rules.remove);
  for (const { item: r, position } of c.rules.upsert) {
    await tx.run(
      `INSERT OR REPLACE INTO rules (id, position, kind, name, amount, category_id, day, every, anchor,
        from_month, to_month, note, active, subscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        position,
        r.kind,
        r.name,
        r.amount,
        r.categoryId,
        r.day,
        r.every,
        r.anchor,
        r.from,
        r.to,
        r.note,
        bool(r.active),
        bool(r.subscription),
      ],
    );
  }

  await deleteIds(tx, 'transactions', c.txs.remove);
  for (const { item: t, position } of c.txs.upsert) {
    await tx.run(
      `INSERT OR REPLACE INTO transactions (id, position, kind, name, amount, category_id, date, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, position, t.kind, t.name, t.amount, t.categoryId, t.date, t.note],
    );
  }

  await deleteIds(tx, 'savings_movements', c.savings.remove, 'account_id');
  await deleteIds(tx, 'savings_accounts', c.savings.remove);
  for (const { item: a, position } of c.savings.upsert) {
    await tx.run(
      `INSERT OR REPLACE INTO savings_accounts (id, position, product, name, bank, balance, balance_date,
        custom_rate, rate_checked_on, opened_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.id,
        position,
        a.product,
        a.name,
        a.bank,
        a.balance,
        a.balanceDate,
        a.customRate,
        a.rateCheckedOn,
        a.openedOn,
      ],
    );
    await tx.run('DELETE FROM savings_movements WHERE account_id = ?', [a.id]);
    for (const m of a.movements) {
      await tx.run(
        'INSERT INTO savings_movements (account_id, id, date, amount) VALUES (?, ?, ?, ?)',
        [a.id, m.id, m.date, m.amount],
      );
    }
  }

  await deleteIds(tx, 'goals', c.goals.remove);
  for (const { item: g, position } of c.goals.upsert) {
    await tx.run(
      'INSERT OR REPLACE INTO goals (id, position, name, target, saved) VALUES (?, ?, ?, ?, ?)',
      [g.id, position, g.name, g.target, g.saved],
    );
  }

  await deleteIds(tx, 'occurrence_marks', c.marks.remove, 'key');
  for (const [key, included] of c.marks.set) {
    await tx.run('INSERT OR REPLACE INTO occurrence_marks (key, included) VALUES (?, ?)', [
      key,
      bool(included),
    ]);
  }
  await deleteIds(tx, 'occurrence_paid', c.paid.remove, 'key');
  for (const key of c.paid.set) {
    await tx.run('INSERT OR REPLACE INTO occurrence_paid (key) VALUES (?)', [key]);
  }

  const s = c.settings;
  if (s) {
    const params: SqlValue[] = [
      c.schemaVersion,
      s.balance,
      s.balanceDate,
      s.buffer,
      s.simAltRate,
      s.lastBackupAt,
    ];
    await tx.run(
      `INSERT OR REPLACE INTO settings (id, schema_version, balance, balance_date, buffer, sim_alt_rate,
        last_backup_at) VALUES (1, ?, ?, ?, ?, ?, ?)`,
      params,
    );
  }
}

export function createSqliteRepository(
  openDatabase: () => Promise<SqlDatabase>,
  onPersist: () => Promise<boolean> = async () => true,
): BudgetRepository {
  let database: SqlDatabase | null = null;
  const db = (): SqlDatabase => {
    if (!database) throw new Error('Storage not opened');
    return database;
  };

  return {
    async open() {
      if (database) return;
      const opened = await openDatabase();
      await opened.exec('PRAGMA foreign_keys = ON');
      await migrate(opened);
      database = opened;
    },

    async read() {
      const [settings] = await db().all<SettingsRow>(
        'SELECT schema_version, balance, balance_date, buffer, sim_alt_rate, last_backup_at FROM settings WHERE id = 1',
      );
      if (!settings) return null;
      const categories = (
        await db().all<CategoryRow>(
          'SELECT id, name, color, need FROM categories ORDER BY position',
        )
      ).map((r): Category => ({ id: r.id, name: r.name, color: r.color, need: r.need === 1 }));
      const rules = (await db().all<RuleRow>('SELECT * FROM rules ORDER BY position')).map(
        (r): Rule => ({
          id: r.id,
          kind: r.kind,
          name: r.name,
          amount: r.amount,
          categoryId: r.category_id,
          day: r.day,
          every: r.every,
          anchor: r.anchor,
          from: r.from_month,
          to: r.to_month,
          note: r.note,
          active: r.active === 1,
          subscription: r.subscription === 1,
        }),
      );
      const txs = (await db().all<TxRow>('SELECT * FROM transactions ORDER BY position')).map(
        (t): Tx => ({
          id: t.id,
          kind: t.kind,
          name: t.name,
          amount: t.amount,
          categoryId: t.category_id,
          date: t.date,
          note: t.note,
        }),
      );
      const movements = await db().all<MovementRow>(
        'SELECT account_id, id, date, amount FROM savings_movements ORDER BY date, id',
      );
      const byAccount = new Map<string, MovementRow[]>();
      for (const m of movements) {
        const list = byAccount.get(m.account_id) ?? [];
        list.push(m);
        byAccount.set(m.account_id, list);
      }
      const savings = (
        await db().all<AccountRow>('SELECT * FROM savings_accounts ORDER BY position')
      ).map((a): SavingsAccount => ({
        id: a.id,
        product: a.product,
        name: a.name,
        bank: a.bank,
        balance: a.balance,
        balanceDate: a.balance_date,
        customRate: a.custom_rate,
        rateCheckedOn: a.rate_checked_on,
        openedOn: a.opened_on,
        movements: (byAccount.get(a.id) ?? []).map(m => ({
          id: m.id,
          date: m.date,
          amount: m.amount,
        })),
      }));
      const goals = (
        await db().all<Goal>('SELECT id, name, target, saved FROM goals ORDER BY position')
      ).map((g): Goal => ({ id: g.id, name: g.name, target: g.target, saved: g.saved }));
      const marks: Record<string, boolean> = {};
      for (const m of await db().all<{ key: string; included: number }>(
        'SELECT key, included FROM occurrence_marks',
      )) {
        marks[m.key] = m.included === 1;
      }
      const paid: Record<string, true> = {};
      for (const p of await db().all<{ key: string }>('SELECT key FROM occurrence_paid'))
        paid[p.key] = true;
      return {
        schemaVersion: settings.schema_version,
        rules,
        txs,
        categories,
        savings,
        goals,
        marks,
        paid,
        settings: {
          balance: settings.balance,
          balanceDate: settings.balance_date,
          buffer: settings.buffer,
          simAltRate: settings.sim_alt_rate,
          lastBackupAt: settings.last_backup_at,
        },
      };
    },

    async write(changes) {
      await db().transaction(tx => applyChanges(tx, changes));
    },

    async readSnapshots() {
      const rows = await db().all<{ data: string }>('SELECT data FROM snapshots ORDER BY id DESC');
      return rows.map(r => r.data);
    },

    async writeSnapshot(json, keep) {
      await db().transaction(async tx => {
        await tx.run('INSERT INTO snapshots (created_at, data) VALUES (?, ?)', [
          new Date().toISOString(),
          json,
        ]);
        await tx.run(
          'DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY id DESC LIMIT ?)',
          [Math.max(1, Math.trunc(keep))],
        );
      });
    },

    async clearAll() {
      await db().transaction(async tx => {
        await applyChanges(tx, {
          reset: true,
          categories: { upsert: [], remove: [] },
          rules: { upsert: [], remove: [] },
          txs: { upsert: [], remove: [] },
          savings: { upsert: [], remove: [] },
          goals: { upsert: [], remove: [] },
          marks: { set: [], remove: [] },
          paid: { set: [], remove: [] },
          settings: null,
          schemaVersion: 0,
        });
        await tx.exec('DELETE FROM snapshots');
      });
      await db().exec('VACUUM');
    },

    requestPersistence: onPersist,
  };
}

export { LATEST_SQLITE_VERSION };
