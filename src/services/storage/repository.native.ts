/**
 * iOS / Android storage: SQLite database in the app's private documents directory
 * (included in the system backup — iCloud / Google — according to the user's settings).
 */
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { BudgetRepository } from './types';
import type { SqlDatabase, SqlExecutor, SqlValue } from './sqlite/database';
import { createSqliteRepository } from './sqlite/sqliteRepository';

export const DATABASE_NAME = 'moni.db';

function executor(db: Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync'>): SqlExecutor {
  return {
    exec: sql => db.execAsync(sql),
    run: async (sql, params: readonly SqlValue[] = []) => {
      await db.runAsync(sql, [...params]);
    },
    all: <T>(sql: string, params: readonly SqlValue[] = []) => db.getAllAsync<T>(sql, [...params]),
  };
}

async function openNativeDatabase(): Promise<SqlDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  // Write-ahead logging: crash-safe and faster concurrent reads.
  await db.execAsync('PRAGMA journal_mode = WAL');
  return {
    ...executor(db),
    transaction: task => db.withExclusiveTransactionAsync(txn => task(executor(txn))),
  };
}

export function createRepository(): BudgetRepository {
  return createSqliteRepository(openNativeDatabase);
}
