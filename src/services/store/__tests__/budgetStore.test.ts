import { addGoal } from '@/features/goals/domain/goals';
import { updateSettings } from '@/features/budget/domain/actions';
import { createSqliteRepository } from '@/services/storage/sqlite/sqliteRepository';
import { nodeSqlite } from '@/services/storage/__tests__/nodeSqlite';
import type { BudgetRepository } from '@/services/storage/types';
import { state } from '@/test/fixtures';
import { createBudgetStore } from '../budgetStore';

const TODAY = '2026-10-22';

function setup() {
  const db = nodeSqlite();
  const repository = createSqliteRepository(async () => db);
  return { repository, reopen: () => createSqliteRepository(async () => db) };
}

describe('budget store', () => {
  it('starts with an empty state on a new device', async () => {
    const store = createBudgetStore(setup().repository);
    expect(store.getSnapshot().status).toBe('loading');
    await store.init(TODAY);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', recovered: false, save: 'saved' });
    expect(store.getSnapshot().state?.settings.balanceDate).toBe(TODAY);
  });

  it('saves changes and restores them after a restart', async () => {
    const { repository, reopen } = setup();
    const store = createBudgetStore(repository);
    await store.init(TODAY);
    store.commit(
      s => addGoal(s, { name: 'Voyage', target: 1000, saved: 0 }, 'g'),
      'Objectif ajouté',
    );
    expect(store.getSnapshot().save).toBe('saving');
    await store.flush();
    expect(store.getSnapshot().save).toBe('saved');

    const restarted = createBudgetStore(reopen());
    await restarted.init(TODAY);
    expect(restarted.getSnapshot().state?.goals.map(g => g.id)).toEqual(['g']);
  });

  it('undoes the last undoable change only', async () => {
    const store = createBudgetStore(setup().repository);
    await store.init(TODAY);
    store.commit(s => addGoal(s, { name: 'A', target: 1, saved: 0 }, 'a'), 'Objectif ajouté');
    expect(store.getSnapshot().undo?.label).toBe('Objectif ajouté');
    store.undo();
    expect(store.getSnapshot().state?.goals).toEqual([]);
    expect(store.getSnapshot().undo).toBeNull();

    store.commit(s => addGoal(s, { name: 'B', target: 1, saved: 0 }, 'b'), 'Objectif ajouté');
    store.commit(s => updateSettings(s, { buffer: 1 }));
    expect(store.getSnapshot().undo).toBeNull();
    store.undo();
    expect(store.getSnapshot().state?.goals.map(g => g.id)).toEqual(['b']);
  });

  it('ignores no-op commits', async () => {
    const store = createBudgetStore(setup().repository);
    await store.init(TODAY);
    const listener = jest.fn();
    store.subscribe(listener);
    store.commit(s => s);
    expect(listener).not.toHaveBeenCalled();
  });

  it('replaces all data on import, and wipes everything on request', async () => {
    const { repository, reopen } = setup();
    const store = createBudgetStore(repository);
    await store.init(TODAY);
    await store.replaceAll(state({ goals: [{ id: 'x', name: 'Import', target: 1, saved: 0 }] }));
    const after = createBudgetStore(reopen());
    await after.init(TODAY);
    expect(after.getSnapshot().state?.goals[0]?.name).toBe('Import');

    await store.wipe(TODAY);
    const wiped = createBudgetStore(reopen());
    await wiped.init(TODAY);
    expect(wiped.getSnapshot().state?.goals).toEqual([]);
  });

  it('reports a failed save and retries', async () => {
    jest.useFakeTimers();
    const { repository } = setup();
    let fail = true;
    const flaky: BudgetRepository = {
      ...repository,
      write: async c => {
        if (fail) throw new Error('disk full');
        return repository.write(c);
      },
    };
    const store = createBudgetStore(flaky);
    await store.init(TODAY);
    store.commit(s => updateSettings(s, { buffer: 42 }));
    await store.flush();
    expect(store.getSnapshot().save).toBe('failed');
    fail = false;
    await jest.advanceTimersByTimeAsync(5000);
    expect(store.getSnapshot().save).toBe('saved');
    jest.useRealTimers();
  });

  it('does not overwrite data written by a newer version', async () => {
    const { repository } = setup();
    await repository.open();
    await repository.write({
      reset: true,
      categories: { upsert: [], remove: [] },
      rules: { upsert: [], remove: [] },
      txs: { upsert: [], remove: [] },
      savings: { upsert: [], remove: [] },
      goals: { upsert: [], remove: [] },
      marks: { set: [], remove: [] },
      paid: { set: [], remove: [] },
      settings: state().settings,
      schemaVersion: 99,
    });
    const store = createBudgetStore(repository);
    await store.init(TODAY);
    expect(store.getSnapshot().status).toBe('newer');
    store.commit(s => updateSettings(s, { buffer: 1 }));
    expect(store.getSnapshot().state).toBeNull();
  });
});
