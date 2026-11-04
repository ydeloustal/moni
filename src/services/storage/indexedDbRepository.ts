/**
 * Web storage: IndexedDB (through Dexie), private to the site's origin, on the user's device only.
 * Limits: the browser may erase it (user cleaning, private browsing, low disk space, Safari after a long
 * period without a visit when the site is not installed). Hence the persistent storage request and
 * the backup reminders.
 */
import { Dexie, type Table } from 'dexie';
import type { Category, Goal, Rule, SavingsAccount, Settings, Tx } from '@/types/domain';
import {
  NewerStorageError,
  type BudgetRepository,
  type ChangeSet,
  type CollectionChanges,
} from './types';

type Stored<T> = T & { position: number };

interface SettingsRecord extends Settings {
  id: 1;
  schemaVersion: number;
}

interface SnapshotRecord {
  id?: number;
  createdAt: string;
  data: string;
}

/**
 * Versioned IndexedDB schema. NEVER edit a published version: add `this.version(n + 1)`
 * with an `upgrade()` callback when the shape changes.
 */
class MoniDatabase extends Dexie {
  categories!: Table<Stored<Category>, string>;
  rules!: Table<Stored<Rule>, string>;
  txs!: Table<Stored<Tx>, string>;
  savings!: Table<Stored<SavingsAccount>, string>;
  goals!: Table<Stored<Goal>, string>;
  marks!: Table<{ key: string; included: boolean }, string>;
  paid!: Table<{ key: string }, string>;
  settings!: Table<SettingsRecord, number>;
  snapshots!: Table<SnapshotRecord, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      categories: 'id, position',
      rules: 'id, position',
      txs: 'id, position, date',
      savings: 'id, position',
      goals: 'id, position',
      marks: 'key',
      paid: 'key',
      settings: 'id',
      snapshots: '++id',
    });
  }

  get userTables(): Table[] {
    return [
      this.categories,
      this.rules,
      this.txs,
      this.savings,
      this.goals,
      this.marks,
      this.paid,
      this.settings,
    ];
  }
}

const stripPosition = <T>({ position: _position, ...item }: Stored<T>): T => item as T;

async function applyCollection<T extends { id: string }>(
  table: Table<Stored<T>, string>,
  changes: CollectionChanges<T>,
): Promise<void> {
  if (changes.remove.length) await table.bulkDelete(changes.remove);
  if (changes.upsert.length) {
    await table.bulkPut(changes.upsert.map(({ item, position }) => ({ ...item, position })));
  }
}

export function createIndexedDbRepository(name = 'moni'): BudgetRepository {
  let database: MoniDatabase | null = null;
  const db = (): MoniDatabase => {
    if (!database) throw new Error('Storage not opened');
    return database;
  };

  return {
    async open() {
      if (database) return;
      const opened = new MoniDatabase(name);
      try {
        await opened.open();
      } catch (error) {
        opened.close();
        if (error instanceof Dexie.VersionError) throw new NewerStorageError();
        throw error;
      }
      database = opened;
    },

    async read() {
      const d = db();
      return d.transaction('r', d.userTables, async () => {
        const settings = await d.settings.get(1);
        if (!settings) return null;
        const { id: _id, schemaVersion, ...rest } = settings;
        const marks: Record<string, boolean> = {};
        for (const m of await d.marks.toArray()) marks[m.key] = m.included;
        const paid: Record<string, true> = {};
        for (const p of await d.paid.toArray()) paid[p.key] = true;
        return {
          schemaVersion,
          categories: (await d.categories.orderBy('position').toArray()).map(stripPosition),
          rules: (await d.rules.orderBy('position').toArray()).map(stripPosition),
          txs: (await d.txs.orderBy('position').toArray()).map(stripPosition),
          savings: (await d.savings.orderBy('position').toArray()).map(stripPosition),
          goals: (await d.goals.orderBy('position').toArray()).map(stripPosition),
          marks,
          paid,
          settings: rest,
        };
      });
    },

    async write(c: ChangeSet) {
      const d = db();
      await d.transaction('rw', d.userTables, async () => {
        if (c.reset) await Promise.all(d.userTables.map(t => t.clear()));
        await applyCollection(d.categories, c.categories);
        await applyCollection(d.rules, c.rules);
        await applyCollection(d.txs, c.txs);
        await applyCollection(d.savings, c.savings);
        await applyCollection(d.goals, c.goals);
        if (c.marks.remove.length) await d.marks.bulkDelete(c.marks.remove);
        if (c.marks.set.length)
          await d.marks.bulkPut(c.marks.set.map(([key, included]) => ({ key, included })));
        if (c.paid.remove.length) await d.paid.bulkDelete(c.paid.remove);
        if (c.paid.set.length) await d.paid.bulkPut(c.paid.set.map(key => ({ key })));
        if (c.settings)
          await d.settings.put({ ...c.settings, id: 1, schemaVersion: c.schemaVersion });
      });
    },

    async readSnapshots() {
      const rows = await db().snapshots.orderBy('id').reverse().toArray();
      return rows.map(r => r.data);
    },

    async writeSnapshot(json, keep) {
      const d = db();
      await d.transaction('rw', d.snapshots, async () => {
        await d.snapshots.add({ createdAt: new Date().toISOString(), data: json });
        const ids = await d.snapshots.orderBy('id').reverse().primaryKeys();
        const extra = ids.slice(Math.max(1, Math.trunc(keep)));
        if (extra.length) await d.snapshots.bulkDelete(extra);
      });
    },

    async clearAll() {
      const d = db();
      await d.transaction('rw', [...d.userTables, d.snapshots], async () => {
        await Promise.all([...d.userTables, d.snapshots].map(t => t.clear()));
      });
    },

    async requestPersistence() {
      try {
        const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
        if (!storage?.persist) return false;
        return (await storage.persisted()) || (await storage.persist());
      } catch {
        return false;
      }
    },
  };
}
