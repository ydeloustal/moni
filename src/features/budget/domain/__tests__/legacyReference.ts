/**
 * Algorithm of the previous PHP/JS version (legacy app.js), copied as-is (float euros),
 * used as an oracle to check that the new engine gives the same results on monthly lines.
 */
interface LegacyEntry {
  id: string;
  type: 'inc' | 'exp';
  amount: number;
  day: number;
  from: string;
  to: string;
  active: boolean;
  cat: string;
  name: string;
}

export interface LegacyState {
  entries: LegacyEntry[];
  marks: Record<string, boolean>;
  paid: Record<string, boolean>;
  settings: { solde: number; soldeDate: string; buffer: number };
}

export function legacy(S: LegacyState) {
  const addM = (m: string, k: number) => {
    const [y = 0, mo = 1] = m.split('-').map(Number);
    const d = new Date(y, mo - 1 + k, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  const daysIn = (m: string) => {
    const [y = 0, mo = 1] = m.split('-').map(Number);
    return new Date(y, mo, 0).getDate();
  };
  const inRange = (e: LegacyEntry, m: string) => (!e.from || e.from <= m) && (!e.to || e.to >= m);
  const occ = (e: LegacyEntry, m: string) => e.active !== false && inRange(e, m);
  const list = (m: string, t: string) => S.entries.filter(e => e.type === t && occ(e, m));
  const sum = (a: LegacyEntry[]) => a.reduce((s, e) => s + e.amount, 0);
  const tot = (m: string) => {
    const exp = sum(list(m, 'exp'));
    const inc = sum(list(m, 'inc'));
    return { exp, inc, rest: inc - exp };
  };
  const baseMonth = () => S.settings.soldeDate.slice(0, 7);
  const months = () => Array.from({ length: 12 }, (_, i) => addM(baseMonth(), i));
  const occDate = (e: LegacyEntry, m: string) =>
    m + '-' + String(Math.min(e.day, daysIn(m))).padStart(2, '0');
  const markKey = (e: LegacyEntry, m: string) => e.id + '|' + m;
  const inAnchor = (e: LegacyEntry, m: string) => {
    const k = markKey(e, m);
    return k in S.marks ? S.marks[k] : occDate(e, m) <= S.settings.soldeDate;
  };
  const isPaid = (e: LegacyEntry, m: string) => !!S.paid[markKey(e, m)];
  const isDone = (e: LegacyEntry, m: string) => inAnchor(e, m) || isPaid(e, m);
  function curBal() {
    let b = S.settings.solde;
    for (const k of Object.keys(S.paid)) {
      if (!S.paid[k]) continue;
      const [id, m = ''] = k.split('|');
      const e = S.entries.find(x => x.id === id);
      if (e && occ(e, m) && !inAnchor(e, m)) b += (e.type === 'inc' ? 1 : -1) * e.amount;
    }
    return b;
  }
  const ops = (m: string) =>
    S.entries
      .filter(e => occ(e, m))
      .map(e => ({ e, m, sign: e.type === 'inc' ? 1 : -1, done: isDone(e, m) }));
  const flow = (m: string) =>
    ops(m)
      .filter(o => !o.done)
      .reduce((s, o) => s + o.sign * o.e.amount, 0);
  function plan() {
    const ms = months();
    const B: number[] = [];
    let b = curBal();
    const F = ms.map(m => {
      const f = flow(m);
      b += f;
      B.push(b);
      return f;
    });
    const M = B.map((_, k) => Math.min(...B.slice(k)));
    let saved = 0;
    return ms.map((m, k) => {
      const s = Math.max(0, (M[k] ?? 0) - saved - S.settings.buffer);
      saved += s;
      const bal = B[k] ?? 0;
      return { m, rest: F[k], full: tot(m).rest, bal, save: s, saved, cash: bal - saved };
    });
  }
  return { curBal, plan, tot };
}
