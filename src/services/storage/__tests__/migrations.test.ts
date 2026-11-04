import { migrate } from '../sqlite/sqliteRepository';
import { LATEST_SQLITE_VERSION, SQLITE_MIGRATIONS } from '../sqlite/migrations';
import { NewerStorageError } from '../types';
import { nodeSqlite } from './nodeSqlite';

const version = (db: ReturnType<typeof nodeSqlite>) =>
  (db.raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

describe('SQLite migrations', () => {
  it('creates the latest schema on a fresh database', async () => {
    const db = nodeSqlite();
    await migrate(db);
    expect(version(db)).toBe(LATEST_SQLITE_VERSION);
    const tables = (
      db.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
        name: string;
      }[]
    ).map(t => t.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'rules',
        'transactions',
        'savings_movements',
        'settings',
        'snapshots',
      ]),
    );
  });

  it('is idempotent', async () => {
    const db = nodeSqlite();
    await migrate(db);
    await migrate(db);
    expect(version(db)).toBe(LATEST_SQLITE_VERSION);
  });

  it('applies only the pending migrations, in order, keeping the data', async () => {
    const db = nodeSqlite();
    await migrate(db);
    db.raw.exec(
      "INSERT INTO goals (id, position, name, target, saved) VALUES ('g', 0, 'Voyage', 100, 0)",
    );
    const next = [
      ...SQLITE_MIGRATIONS,
      {
        version: LATEST_SQLITE_VERSION + 1,
        description: 'test',
        statements: ['ALTER TABLE goals ADD COLUMN deadline TEXT'],
      },
    ];
    await migrate(db, next);
    expect(version(db)).toBe(LATEST_SQLITE_VERSION + 1);
    expect(db.raw.prepare('SELECT name, deadline FROM goals').all()).toEqual([
      { name: 'Voyage', deadline: null },
    ]);
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const db = nodeSqlite();
    await migrate(db);
    const broken = [
      ...SQLITE_MIGRATIONS,
      {
        version: LATEST_SQLITE_VERSION + 1,
        description: 'broken',
        statements: ['CREATE TABLE x (a)', 'NOT SQL'],
      },
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(version(db)).toBe(LATEST_SQLITE_VERSION);
    expect(
      db.raw.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'x'").get(),
    ).toEqual({ n: 0 });
  });

  it('refuses a database written by a newer version', async () => {
    const db = nodeSqlite();
    db.raw.exec(`PRAGMA user_version = ${LATEST_SQLITE_VERSION + 5}`);
    await expect(migrate(db)).rejects.toBeInstanceOf(NewerStorageError);
  });
});
