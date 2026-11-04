/// <reference types="node" />
import { randomBytes } from 'node:crypto';
import { emptyState } from '@/features/budget/domain/state';
import { rule, state } from '@/test/fixtures';
import { fromBase64, toBase64 } from '@/utils/base64';
import {
  decryptBackup,
  encryptBackup,
  parseBackup,
  plainBackup,
  type EncryptedEnvelope,
} from '../crypto';
import { toCsv } from '../exportCsv';
import { importData } from '../importData';
import { NewerDataError, sanitizeState } from '../sanitize';

jest.setTimeout(120_000);

const random = (n: number) => new Uint8Array(randomBytes(n));
/** Reduced parameters to keep tests fast. */
const FAST = { params: { t: 1, m: 8192, p: 1 } };
const PASS = 'une longue phrase de passe';

async function encrypted(secret: string): Promise<EncryptedEnvelope> {
  const parsed = parseBackup(await encryptBackup(secret, PASS, random, FAST));
  if (parsed.kind !== 'encrypted') throw new Error('expected an encrypted backup');
  return parsed.envelope;
}

describe('encrypted backup', () => {
  const secret = JSON.stringify({ hello: 'Loyer 550 €', n: 42 });

  it('round-trips with the right passphrase and hides the content', async () => {
    const text = await encryptBackup(secret, PASS, random, FAST);
    expect(text).not.toContain('Loyer');
    const env = await encrypted(secret);
    await expect(decryptBackup(env, PASS)).resolves.toBe(secret);
  });

  it('uses Argon2id 19 MiB, 2 passes by default', async () => {
    const parsed = parseBackup(await encryptBackup(secret, PASS, random));
    if (parsed.kind !== 'encrypted') throw new Error();
    expect(parsed.envelope.kdf).toMatchObject({ name: 'argon2id', t: 2, m: 19456, p: 1 });
  });

  it('gives a clear error with a wrong passphrase', async () => {
    await expect(
      decryptBackup(await encrypted(secret), 'une autre phrase de passe'),
    ).rejects.toThrow(/incorrecte/);
  });

  it('rejects a modified header or content', async () => {
    const env = await encrypted(secret);
    await expect(decryptBackup({ ...env, kdf: { ...env.kdf, t: 2 } }, PASS)).rejects.toThrow();
    const bytes = fromBase64(env.data);
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    await expect(decryptBackup({ ...env, data: toBase64(bytes) }, PASS)).rejects.toThrow();
  });

  it('rejects a short passphrase', async () => {
    await expect(encryptBackup(secret, 'court', random, FAST)).rejects.toThrow(/trop courte/);
  });

  it('rejects trapped parameters (huge memory) before any computation', async () => {
    const env = { ...(await encrypted(secret)) };
    env.kdf = { ...env.kdf, m: 4_000_000 };
    expect(() => parseBackup(JSON.stringify(env))).toThrow(/invalide/);
  });

  it('produces different files for the same content (random salt and nonce)', async () => {
    const a = await encryptBackup(secret, PASS, random, FAST);
    const b = await encryptBackup(secret, PASS, random, FAST);
    expect(a).not.toBe(b);
  });

  it('reads plain exports, raw JSON and rejects garbage', () => {
    expect(parseBackup(plainBackup({ a: 1 }))).toEqual({ kind: 'plain', data: { a: 1 } });
    expect(parseBackup('{"entries":[]}')).toEqual({ kind: 'raw', data: { entries: [] } });
    expect(() => parseBackup('not json')).toThrow(/lisible/);
    expect(() => parseBackup('{"format":"moni-backup","v":2}')).toThrow(/plus récente/);
  });
});

describe('import validation', () => {
  it('neutralises hostile values', () => {
    const s = sanitizeState(
      {
        rules: [
          {
            id: 'a<script>',
            kind: 'exp',
            name: '<img src=x onerror=alert(1)>\u0000',
            amount: 1e20,
            day: 99,
            every: 7,
            categoryId: 'unknown',
            from: '2026-13',
            to: 'x',
            active: 'oui',
          },
          { id: 'a<script>', kind: 'exp', name: 'duplicate', amount: 1 },
          'garbage',
        ],
        txs: [
          { id: 't1', kind: 'inc', amount: -500, date: '2026-02-30', name: 'impossible date' },
          { id: 't2', kind: 'inc', amount: -500, date: '2026-02-28', categoryId: 'logement' },
        ],
        settings: { balance: -12.4, balanceDate: 'tomorrow', buffer: 'a lot', simAltRate: 500 },
        marks: { 'a|2026-10': true, '../../etc': true },
        paid: { 'a|2026-10': 'yes', 't:t2': true },
        savings: [
          {
            id: 's',
            product: 'crypto',
            balance: 100,
            movements: [{ id: 'm', date: '2026-01-01', amount: -50 }],
          },
        ],
        schemaVersion: 1,
      },
      '2026-10-22',
    );
    expect(s.rules).toHaveLength(1);
    expect(s.rules[0]).toMatchObject({
      id: 'ascript',
      name: '<img src=x onerror=alert(1)>',
      amount: 10_000_000_000,
      day: 31,
      every: 1,
      categoryId: null,
      from: null,
      to: null,
      active: true,
    });
    expect(s.txs.map(t => t.id)).toEqual(['t2']);
    expect(s.txs[0]).toMatchObject({ amount: 500, categoryId: null });
    expect(s.settings).toEqual({
      balance: -12,
      balanceDate: '2026-10-22',
      buffer: 0,
      simAltRate: null,
      lastBackupAt: null,
    });
    expect(s.marks).toEqual({ 'a|2026-10': true });
    expect(s.paid).toEqual({ 't:t2': true });
    expect(s.savings[0]).toMatchObject({ product: 'autre', movements: [{ amount: -50 }] });
  });

  it('rejects a missing structure explicitly', () => {
    expect(() => sanitizeState({ foo: 1 }, '2026-10-22')).toThrow(/format/);
    expect(() => sanitizeState(null, '2026-10-22')).toThrow();
  });

  it('refuses data written by a newer version', () => {
    expect(() =>
      sanitizeState({ ...emptyState('2026-10-22'), schemaVersion: 99 }, '2026-10-22'),
    ).toThrow(NewerDataError);
  });

  it('keeps a valid state unchanged', () => {
    const s = emptyState('2026-10-22');
    expect(sanitizeState(JSON.parse(JSON.stringify(s)), '2026-10-22')).toEqual(s);
  });
});

describe('import from the legacy PHP version', () => {
  const legacyExport = {
    entries: [
      {
        id: 'e01',
        type: 'exp',
        name: 'Loyer',
        amount: 550,
        day: 5,
        cat: 'logement',
        from: '',
        to: '',
        note: '',
        active: true,
      },
      {
        id: 'e02',
        type: 'exp',
        name: 'Forfait',
        amount: 9.99,
        day: 12,
        cat: 'abonnements',
        from: '2026-01',
        to: '2026-12',
        note: 'promo',
        active: false,
      },
      {
        id: 'i01',
        type: 'inc',
        name: 'Salaire',
        amount: 1600.5,
        day: 1,
        cat: '',
        from: '',
        to: '',
        note: '',
        active: true,
      },
    ],
    goals: [{ id: 'g01', name: "Fonds d'urgence", target: 2000, saved: 150.25 }],
    settings: {
      solde: -42.1,
      soldeDate: '2026-10-03',
      saved: 300,
      buffer: 50,
      rateSafe: 3,
      rateRisk: 7,
    },
    marks: { 'e01|2026-10': true },
    paid: { 'i01|2026-11': true },
  };

  it('converts euros to cents, detects subscriptions and keeps ticks', () => {
    const r = importData(legacyExport, '2026-10-22');
    expect(r.source).toBe('legacy-php');
    expect(
      r.state.rules.map(x => [x.id, x.amount, x.subscription, x.active, x.categoryId]),
    ).toEqual([
      ['e01', 55000, false, true, 'logement'],
      ['e02', 999, true, false, 'abonnements'],
      ['i01', 160050, false, true, null],
    ]);
    expect(r.state.goals[0]).toMatchObject({ target: 200000, saved: 15025 });
    expect(r.state.settings).toMatchObject({
      balance: -4210,
      balanceDate: '2026-10-03',
      buffer: 5000,
      simAltRate: 7,
    });
    expect(r.state.marks).toEqual({ 'e01|2026-10': true });
    expect(r.state.paid).toEqual({ 'i01|2026-11': true });
    expect(r.state.savings[0]).toMatchObject({ product: 'autre', balance: 30000 });
    expect(r.warnings).toHaveLength(2);
  });

  it('imports current Moni data as is', () => {
    const s = state({ rules: [rule({ id: 'a', amount: 1 })] });
    const r = importData(JSON.parse(JSON.stringify(s)), '2026-10-22');
    expect(r.source).toBe('moni');
    expect(r.state).toEqual(s);
  });
});

describe('CSV export', () => {
  it('writes one line per recurring line and per operation', () => {
    const csv = toCsv(state({ rules: [rule({ id: 'a', name: 'Loyer', amount: 55000 })] }));
    expect(csv.startsWith('﻿genre;type;nom')).toBe(true);
    expect(csv).toContain('recurrent;depense;Loyer;550,00;Logement;1;mensuelle');
  });

  it('neutralises formulas typed in names', () => {
    expect(
      toCsv(state({ rules: [rule({ id: 'a', name: '=HYPERLINK("x")', amount: 1 })] })),
    ).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
