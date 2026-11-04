/** Minimal SQL interface: implemented by expo-sqlite on device, and by node:sqlite in the tests. */
export type SqlValue = string | number | null;

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
}

export interface SqlDatabase extends SqlExecutor {
  /** Runs `task` in an exclusive transaction: committed if it resolves, rolled back if it throws. */
  transaction(task: (tx: SqlExecutor) => Promise<void>): Promise<void>;
}
