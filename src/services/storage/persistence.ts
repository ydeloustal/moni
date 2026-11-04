/**
 * Loading with recovery. Damaged data is NEVER erased automatically: the newest readable snapshot is used,
 * and if nothing is readable, the error is reported so that the user can restore a backup.
 */
import { emptyState } from '@/features/budget/domain/state';
import { NewerDataError, sanitizeState } from '@/features/backup/domain/sanitize';
import type { BudgetState } from '@/types/domain';
import type { Day } from '@/utils/dates';
import { diffStates } from './diff';
import { NewerStorageError, type BudgetRepository } from './types';

const SNAPSHOT_FORMAT = 'moni-snapshot';
export const SNAPSHOTS_KEPT = 3;

export type LoadResult =
  | { kind: 'new'; state: BudgetState }
  | { kind: 'ok'; state: BudgetState }
  /** The stored data was unreadable: the newest readable snapshot was used. */
  | { kind: 'recovered'; state: BudgetState }
  /** Data written by a newer version of the app: nothing must be overwritten. */
  | { kind: 'newer'; message: string }
  /** Nothing readable: the app must not overwrite anything without the user's consent. */
  | { kind: 'error'; message: string };

export const serializeSnapshot = (state: BudgetState): string =>
  JSON.stringify({ format: SNAPSHOT_FORMAT, v: 1, state });

function parseSnapshot(json: string, today: Day): BudgetState {
  const parsed = JSON.parse(json) as { format?: unknown; state?: unknown };
  if (parsed.format !== SNAPSHOT_FORMAT) throw new Error('Unknown snapshot format');
  return sanitizeState(parsed.state, today);
}

const isNewer = (e: unknown): boolean =>
  e instanceof NewerStorageError || e instanceof NewerDataError;

export async function loadBudget(repository: BudgetRepository, today: Day): Promise<LoadResult> {
  try {
    await repository.open();
  } catch (e) {
    if (isNewer(e)) return { kind: 'newer', message: (e as Error).message };
    return { kind: 'error', message: "Impossible d'ouvrir le stockage de l'appareil." };
  }

  try {
    const raw = await repository.read();
    if (raw === null) return { kind: 'new', state: emptyState(today) };
    const state = sanitizeState(raw, today);
    void repository.writeSnapshot(serializeSnapshot(state), SNAPSHOTS_KEPT).catch(() => undefined);
    return { kind: 'ok', state };
  } catch (e) {
    if (isNewer(e)) return { kind: 'newer', message: (e as Error).message };
  }

  try {
    for (const json of await repository.readSnapshots()) {
      try {
        return { kind: 'recovered', state: parseSnapshot(json, today) };
      } catch (e) {
        if (isNewer(e)) return { kind: 'newer', message: (e as Error).message };
      }
    }
  } catch {
    // reported below
  }
  return { kind: 'error', message: 'Les données enregistrées sur cet appareil sont illisibles.' };
}

/** Writes the differences between `previous` (null = full rewrite) and `next`. */
export function saveBudget(
  repository: BudgetRepository,
  previous: BudgetState | null,
  next: BudgetState,
): Promise<void> {
  return repository.write(diffStates(previous, next));
}

export function saveSnapshot(repository: BudgetRepository, state: BudgetState): Promise<void> {
  return repository.writeSnapshot(serializeSnapshot(state), SNAPSHOTS_KEPT);
}
