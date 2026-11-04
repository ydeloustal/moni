import 'fake-indexeddb/auto';
import { addTx, deleteRule, setPaid, updateRule } from '@/features/budget/domain/actions';
import { addSavingsMovement } from '@/features/savings/domain/actions';
import { account, rule, state, tx } from '@/test/fixtures';
import type { BudgetState } from '@/types/domain';
import { diffStates, isEmptyChangeSet } from '../diff';
import { createIndexedDbRepository } from '../indexedDbRepository';
import { loadBudget, saveBudget, saveSnapshot } from '../persistence';
import { createSqliteRepository } from '../sqlite/sqliteRepository';
import type { BudgetRepository } from '../types';
import { nodeSqlite } from './nodeSqlite';

const TODAY = '2026-10-22';

function sample(): BudgetState {
  return state(
    {
      rules: [
        rule({ id: 'loyer', amount: 55000, day: 5, note: 'appart' }),
        rule({ id: 'sal', kind: 'inc', categoryId: null, amount: 180000, day: 28, to: '2027-06' }),
        rule({
          id: 'net',
          amount: 1399,
          every: 3,
          anchor: '2026-02',
          subscription: true,
          active: false,
        }),
      ],
      txs: [tx({ id: 'c1', amount: 4210, date: '2026-10-12', note: 'courses' })],
      savings: [
        account({
          id: 'la',
          product: 'livret-a',
          movements: [{ id: 'm1', date: '2026-03-01', amount: -1000 }],
        }),
        account({
          id: 'lb',
          product: 'livret-bancaire',
          customRate: 3.25,
          rateCheckedOn: '2026-09-01',
        }),
      ],
      goals: [{ id: 'g', name: 'Voyage', target: 200000, saved: 15000 }],
      marks: { 'loyer|2026-10': true, 'sal|2026-10': false },
      paid: { 't:c1': true },
    },
    { balance: -4210, simAltRate: 4.5, lastBackupAt: '2026-10-01' },
  );
}

type Factory = () => { repository: BudgetRepository; reopen: () => BudgetRepository };

let dbCounter = 0;
const backends: [string, Factory][] = [
  [
    'SQLite',
    () => {
      const db = nodeSqlite();
      return {
        repository: createSqliteRepository(async () => db),
        reopen: () => createSqliteRepository(async () => db),
      };
    },
  ],
  [
    'IndexedDB',
    () => {
      const name = `moni-test-${++dbCounter}`;
      return {
        repository: createIndexedDbRepository(name),
        reopen: () => createIndexedDbRepository(name),
      };
    },
  ],
];

describe.each(backends)('%s repository', (_name, factory) => {
  it('starts empty, then persists a full state across restarts', async () => {
    const { repository, reopen } = factory();
    const first = await loadBudget(repository, TODAY);
    expect(first.kind).toBe('new');
    const s = sample();
    await saveBudget(repository, null, s);
    const again = await loadBudget(reopen(), TODAY);
    expect(again).toEqual({ kind: 'ok', state: s });
  });

  it('applies incremental changes (insert, update, delete, ticks, nested movements)', async () => {
    const { repository, reopen } = factory();
    await repository.open();
    let current = sample();
    await saveBudget(repository, null, current);
    const steps: ((s: BudgetState) => BudgetState)[] = [
      s =>
        addTx(
          s,
          {
            kind: 'exp',
            name: 'Ciné',
            amount: 1200,
            categoryId: 'loisirs',
            date: '2026-10-15',
            note: '',
          },
          TODAY,
          'c2',
        ),
      s => updateRule(s, 'loyer', { amount: 56000 }),
      s => deleteRule(s, 'sal'),
      s => setPaid(s, 'loyer|2026-11', true),
      s => setPaid(s, 't:c1', false),
      s => addSavingsMovement(s, 'la', { date: '2026-05-01', amount: 5000 }, 'm2'),
      s => ({ ...s, marks: {} }),
    ];
    for (const step of steps) {
      const next = step(current);
      await saveBudget(repository, current, next);
      current = next;
    }
    const loaded = await loadBudget(reopen(), TODAY);
    expect(loaded).toEqual({ kind: 'ok', state: current });
  });

  it('keeps the order of collections after deletions and insertions', async () => {
    const { repository, reopen } = factory();
    await repository.open();
    const a = state({ rules: ['r1', 'r2', 'r3'].map(id => rule({ id, amount: 1 })) });
    await saveBudget(repository, null, a);
    const b = { ...a, rules: [...a.rules.slice(1), rule({ id: 'r4', amount: 2 })] };
    await saveBudget(repository, a, b);
    const loaded = await loadBudget(reopen(), TODAY);
    expect(loaded.kind === 'ok' && loaded.state.rules.map(r => r.id)).toEqual(['r2', 'r3', 'r4']);
  });

  it('keeps the newest snapshots only and recovers from them when data is unreadable', async () => {
    const { repository } = factory();
    await repository.open();
    const s = sample();
    for (let i = 0; i < 5; i++)
      await saveSnapshot(repository, {
        ...s,
        goals: [{ id: 'g', name: `v${i}`, target: 1, saved: 0 }],
      });
    const snapshots = await repository.readSnapshots();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0]).toContain('"v4"');

    const broken: BudgetRepository = { ...repository, read: async () => ({ rules: 'corrupted' }) };
    const recovered = await loadBudget(broken, TODAY);
    expect(recovered.kind).toBe('recovered');
    expect(recovered.kind === 'recovered' && recovered.state.goals[0]?.name).toBe('v4');
  });

  it('reports an error without erasing anything when nothing is readable', async () => {
    const { repository } = factory();
    await repository.open();
    await saveBudget(repository, null, sample());
    const broken: BudgetRepository = {
      ...repository,
      read: async () => 42,
      readSnapshots: async () => ['{bad'],
    };
    expect((await loadBudget(broken, TODAY)).kind).toBe('error');
    expect(await repository.read()).not.toBeNull();
  });

  it('refuses data written by a newer version of the app', async () => {
    const { repository } = factory();
    await repository.open();
    await saveBudget(repository, null, { ...sample(), schemaVersion: 99 });
    expect((await loadBudget(repository, TODAY)).kind).toBe('newer');
  });

  it('erases everything on "Erase all my data"', async () => {
    const { repository, reopen } = factory();
    await repository.open();
    await saveBudget(repository, null, sample());
    await saveSnapshot(repository, sample());
    await repository.clearAll();
    const r = reopen();
    expect((await loadBudget(r, TODAY)).kind).toBe('new');
    expect(await r.readSnapshots()).toEqual([]);
  });

  it('rolls back a failed write entirely', async () => {
    const { repository } = factory();
    await repository.open();
    const s = sample();
    await saveBudget(repository, null, s);
    const changes = diffStates(s, { ...s, goals: [] });
    // A malformed record makes the write fail half-way.
    const poisoned = {
      ...changes,
      rules: { upsert: [{ item: null as never, position: 0 }], remove: [] },
    };
    await expect(repository.write(poisoned)).rejects.toThrow();
    expect(((await repository.read()) as BudgetState).goals).toHaveLength(1);
  });
});

describe('state diff', () => {
  it('detects nothing when the state did not change', () => {
    const s = sample();
    expect(isEmptyChangeSet(diffStates(s, s))).toBe(true);
    expect(isEmptyChangeSet(diffStates(null, s))).toBe(false);
  });

  it('only writes changed items', () => {
    const s = sample();
    const next = updateRule(s, 'net', { amount: 1499 });
    const c = diffStates(s, next);
    expect(c.rules.upsert.map(u => u.item.id)).toEqual(['net']);
    expect(c.txs.upsert).toEqual([]);
    expect(c.settings).toBeNull();
  });
});
