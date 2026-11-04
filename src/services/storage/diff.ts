import type { BudgetState } from '@/types/domain';
import type { ChangeSet, CollectionChanges } from './types';

/**
 * Items are immutable: an unchanged item keeps the same object reference between two states.
 * An item is written when it is new, when its object changed, or when its position changed.
 */
function diffCollection<T extends { id: string }>(
  previous: readonly T[] | null,
  next: readonly T[],
): CollectionChanges<T> {
  const before = new Map<string, { item: T; position: number }>();
  previous?.forEach((item, position) => before.set(item.id, { item, position }));
  const upsert: CollectionChanges<T>['upsert'] = [];
  const seen = new Set<string>();
  next.forEach((item, position) => {
    seen.add(item.id);
    const old = before.get(item.id);
    if (!old || old.item !== item || old.position !== position) upsert.push({ item, position });
  });
  const remove = previous ? [...before.keys()].filter(id => !seen.has(id)) : [];
  return { upsert, remove };
}

function diffRecord<V>(
  previous: Readonly<Record<string, V>> | null,
  next: Readonly<Record<string, V>>,
): { set: [string, V][]; remove: string[] } {
  const set: [string, V][] = [];
  for (const [key, value] of Object.entries(next)) {
    if (!previous || previous[key] !== value) set.push([key, value]);
  }
  const remove = previous ? Object.keys(previous).filter(key => !(key in next)) : [];
  return { set, remove };
}

/** Changes to go from `previous` (null = nothing stored, or full rewrite) to `next`. */
export function diffStates(previous: BudgetState | null, next: BudgetState): ChangeSet {
  const paid = diffRecord(previous?.paid ?? null, next.paid);
  return {
    reset: previous === null,
    categories: diffCollection(previous?.categories ?? null, next.categories),
    rules: diffCollection(previous?.rules ?? null, next.rules),
    txs: diffCollection(previous?.txs ?? null, next.txs),
    savings: diffCollection(previous?.savings ?? null, next.savings),
    goals: diffCollection(previous?.goals ?? null, next.goals),
    marks: diffRecord(previous?.marks ?? null, next.marks),
    paid: { set: paid.set.map(([key]) => key), remove: paid.remove },
    settings: !previous || previous.settings !== next.settings ? next.settings : null,
    schemaVersion: next.schemaVersion,
  };
}

export function isEmptyChangeSet(c: ChangeSet): boolean {
  return (
    !c.reset &&
    c.settings === null &&
    [c.categories, c.rules, c.txs, c.savings, c.goals].every(
      x => x.upsert.length === 0 && x.remove.length === 0,
    ) &&
    c.marks.set.length === 0 &&
    c.marks.remove.length === 0 &&
    c.paid.set.length === 0 &&
    c.paid.remove.length === 0
  );
}
