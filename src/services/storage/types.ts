import type { Category, Goal, Rule, SavingsAccount, Settings, Tx } from '@/types/domain';

/**
 * Single storage interface used by the whole app (repository pattern).
 * Implementations: SQLite on iOS/Android (repository.native.ts), IndexedDB on the web (repository.web.ts).
 *
 * Contract:
 *  - `open()` creates or migrates the schema; it throws `NewerStorageError` when the data was written by a newer app.
 *  - Every write is atomic (one transaction): a crash never leaves half-written data.
 *  - Nothing is ever deleted implicitly; only `clearAll()` erases user data.
 */
export interface BudgetRepository {
  open(): Promise<void>;
  /** Raw stored data, to be validated by the caller; null when nothing was ever saved. */
  read(): Promise<unknown>;
  /** Applies the differences between two states in one transaction. */
  write(changes: ChangeSet): Promise<void>;
  /** Last known-good copies of the data, newest first (recovery). */
  readSnapshots(): Promise<string[]>;
  /** Stores a known-good copy and keeps only the `keep` newest ones. */
  writeSnapshot(json: string, keep: number): Promise<void>;
  /** Erases every user data, snapshots included ("Erase all my data"). */
  clearAll(): Promise<void>;
  /** Asks the platform to keep the data (web: persistent storage). Best effort. */
  requestPersistence(): Promise<boolean>;
}

export class NewerStorageError extends Error {
  constructor() {
    super(
      "Les données de cet appareil ont été enregistrées par une version plus récente de Moni : mets l'application à jour.",
    );
    this.name = 'NewerStorageError';
  }
}

export interface Positioned<T> {
  item: T;
  position: number;
}

export interface CollectionChanges<T> {
  upsert: Positioned<T>[];
  remove: string[];
}

/** Differences between two states, computed once and applied by each backend. */
export interface ChangeSet {
  /** true: erase every collection before applying (first write, import, recovery). */
  reset: boolean;
  categories: CollectionChanges<Category>;
  rules: CollectionChanges<Rule>;
  txs: CollectionChanges<Tx>;
  savings: CollectionChanges<SavingsAccount>;
  goals: CollectionChanges<Goal>;
  marks: { set: [string, boolean][]; remove: string[] };
  paid: { set: string[]; remove: string[] };
  settings: Settings | null;
  schemaVersion: number;
}
