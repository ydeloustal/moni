/// <reference types="node" />
/** node:sqlite adapter of the SqlDatabase interface, to test the real SQL schema and queries. */
import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase, SqlExecutor, SqlValue } from '../sqlite/database';

export function nodeSqlite(path = ':memory:'): SqlDatabase & { raw: DatabaseSync } {
  const raw = new DatabaseSync(path);
  const executor: SqlExecutor = {
    exec: async sql => {
      raw.exec(sql);
    },
    run: async (sql, params: readonly SqlValue[] = []) => {
      raw.prepare(sql).run(...params);
    },
    all: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      raw.prepare(sql).all(...params) as unknown as T[],
  };
  let queue: Promise<unknown> = Promise.resolve();
  return {
    ...executor,
    raw,
    transaction: task => {
      const run = queue.then(async () => {
        raw.exec('BEGIN IMMEDIATE');
        try {
          await task(executor);
          raw.exec('COMMIT');
        } catch (e) {
          raw.exec('ROLLBACK');
          throw e;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
