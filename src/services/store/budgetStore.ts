/**
 * Global app state: one immutable `BudgetState`, changed only through `commit(fn)` with a pure function.
 * Automatic saving (grouped every 300 ms, forced when the app goes to the background), one-level undo.
 */
import { emptyState } from '@/features/budget/domain/state';
import type { BudgetState } from '@/types/domain';
import { todayOf, type Day } from '@/utils/dates';
import { loadBudget, saveBudget, saveSnapshot } from '@/services/storage/persistence';
import type { BudgetRepository } from '@/services/storage/types';

export type StoreStatus = 'loading' | 'ready' | 'error' | 'newer';
export type SaveStatus = 'saved' | 'saving' | 'failed';

export interface UndoEntry {
  label: string;
  /** Incremented on every undoable change, so that the UI can restart its timer. */
  id: number;
}

export interface StoreSnapshot {
  status: StoreStatus;
  state: BudgetState | null;
  error: string | null;
  /** The data was unreadable and the last known-good copy was loaded. */
  recovered: boolean;
  save: SaveStatus;
  undo: UndoEntry | null;
}

const SAVE_DELAY_MS = 300;
const RETRY_DELAY_MS = 4000;
const SNAPSHOT_MIN_INTERVAL_MS = 10 * 60 * 1000;

export interface BudgetStore {
  getSnapshot(): StoreSnapshot;
  subscribe(listener: () => void): () => void;
  init(today?: Day): Promise<void>;
  commit(fn: (state: BudgetState) => BudgetState, undoLabel?: string): void;
  undo(): void;
  dismissUndo(): void;
  /** Replaces every piece of data (import) and saves immediately. */
  replaceAll(state: BudgetState): Promise<void>;
  /** Erases every piece of data on the device and starts over. */
  wipe(today?: Day): Promise<void>;
  /** Writes pending changes now (also called when the app goes to the background). */
  flush(): Promise<void>;
  /** Flush + known-good snapshot (throttled). */
  checkpoint(): Promise<void>;
}

export function createBudgetStore(repository: BudgetRepository): BudgetStore {
  let snapshot: StoreSnapshot = {
    status: 'loading',
    state: null,
    error: null,
    recovered: false,
    save: 'saved',
    undo: null,
  };
  const listeners = new Set<() => void>();
  /** Last state successfully written; null = the next write is a full rewrite. */
  let persisted: BudgetState | null = null;
  let undoState: BudgetState | null = null;
  let undoCounter = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> = Promise.resolve();
  let lastSnapshotAt = 0;

  const set = (patch: Partial<StoreSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach(l => l());
  };

  const clearTimers = () => {
    if (timer) clearTimeout(timer);
    if (retryTimer) clearTimeout(retryTimer);
    timer = null;
    retryTimer = null;
  };

  function flush(): Promise<void> {
    clearTimers();
    writing = writing.then(async () => {
      const target = snapshot.state;
      if (!target || target === persisted || snapshot.status !== 'ready') return;
      try {
        await saveBudget(repository, persisted, target);
        persisted = target;
        if (snapshot.state === target) set({ save: 'saved' });
      } catch {
        set({ save: 'failed' });
        retryTimer = setTimeout(() => void flush(), RETRY_DELAY_MS);
      }
    });
    return writing;
  }

  function scheduleSave() {
    if (snapshot.save !== 'saving') set({ save: 'saving' });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  return {
    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async init(today = todayOf()) {
      const result = await loadBudget(repository, today);
      switch (result.kind) {
        case 'new':
          persisted = null;
          set({ status: 'ready', state: result.state, error: null, recovered: false });
          break;
        case 'ok':
          persisted = result.state;
          lastSnapshotAt = Date.now();
          set({ status: 'ready', state: result.state, error: null, recovered: false });
          break;
        case 'recovered':
          // Full rewrite of the damaged data with the recovered copy on the next save.
          persisted = null;
          set({ status: 'ready', state: result.state, error: null, recovered: true });
          scheduleSave();
          break;
        case 'newer':
          set({ status: 'newer', state: null, error: result.message });
          return;
        case 'error':
          set({ status: 'error', state: null, error: result.message });
          return;
      }
      void repository.requestPersistence().catch(() => false);
    },

    commit(fn, undoLabel) {
      const previous = snapshot.state;
      if (!previous || snapshot.status !== 'ready') return;
      const next = fn(previous);
      if (next === previous) return;
      if (undoLabel) {
        undoState = previous;
        set({ state: next, undo: { label: undoLabel, id: ++undoCounter } });
      } else {
        // A later change makes the previous undo ambiguous: drop it.
        undoState = null;
        set({ state: next, undo: null });
      }
      scheduleSave();
    },

    undo() {
      const previous = undoState;
      if (!previous) return;
      undoState = null;
      set({ state: previous, undo: null });
      scheduleSave();
    },

    dismissUndo() {
      undoState = null;
      if (snapshot.undo) set({ undo: null });
    },

    async replaceAll(state) {
      await writing;
      clearTimers();
      undoState = null;
      persisted = null;
      set({ state, status: 'ready', error: null, recovered: false, undo: null, save: 'saving' });
      await flush();
      if (snapshot.save === 'failed')
        throw new Error("Impossible d'enregistrer les données importées.");
      await saveSnapshot(repository, state).catch(() => undefined);
    },

    async wipe(today = todayOf()) {
      await writing;
      clearTimers();
      await repository.open();
      await repository.clearAll();
      undoState = null;
      persisted = null;
      set({
        state: emptyState(today),
        status: 'ready',
        error: null,
        recovered: false,
        undo: null,
        save: 'saved',
      });
    },

    flush,

    async checkpoint() {
      await flush();
      const state = snapshot.state;
      if (
        !state ||
        snapshot.save !== 'saved' ||
        Date.now() - lastSnapshotAt < SNAPSHOT_MIN_INTERVAL_MS
      )
        return;
      lastSnapshotAt = Date.now();
      await saveSnapshot(repository, state).catch(() => undefined);
    },
  };
}
