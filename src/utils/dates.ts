/**
 * Dates are local ISO strings, comparable lexicographically:
 *  - Month: "YYYY-MM"
 *  - Day:   "YYYY-MM-DD"
 * Date objects are kept out of the data model (time zones, daylight saving time).
 */
export type Month = string;
export type Day = string;

const pad = (n: number): string => String(n).padStart(2, '0');

export const isMonth = (v: unknown): v is Month =>
  typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export function isDay(v: unknown): v is Day {
  if (typeof v !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(v)) return false;
  const day = Number(v.slice(8));
  return day >= 1 && day <= daysIn(v.slice(0, 7));
}

export function todayOf(now: Date = new Date()): Day {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
export const monthOf = (d: Day): Month => d.slice(0, 7);
export const dayOfMonth = (d: Day): number => Number(d.slice(8));

function parts(m: Month): [number, number] {
  return [Number(m.slice(0, 4)), Number(m.slice(5, 7))];
}

export function addMonths(m: Month, k: number): Month {
  const [y, mo] = parts(m);
  const t = y * 12 + (mo - 1) + k;
  return `${Math.floor(t / 12)}-${pad((((t % 12) + 12) % 12) + 1)}`;
}

/** Number of months from a to b (b − a). */
export function monthsBetween(a: Month, b: Month): number {
  const [ya, ma] = parts(a);
  const [yb, mb] = parts(b);
  return (yb - ya) * 12 + (mb - ma);
}

export function daysIn(m: Month): number {
  const [y, mo] = parts(m);
  return new Date(y, mo, 0).getDate();
}

/** Date of day `day` in month `m`; 31 becomes the last day of short months. */
export const dayInMonth = (m: Month, day: number): Day =>
  `${m}-${pad(Math.min(Math.max(1, day), daysIn(m)))}`;

export function monthRange(from: Month, count: number): Month[] {
  return Array.from({ length: count }, (_, i) => addMonths(from, i));
}

/** Whole days from a to b (b − a), computed in UTC to ignore daylight saving time. */
export function daysBetween(a: Day, b: Day): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export const monthName = (m: Month): string => MONTH_NAMES[Number(m.slice(5, 7)) - 1] ?? '';
export const monthLabel = (m: Month): string => `${monthName(m)} ${m.slice(0, 4)}`;

export function monthShort(m: Month): string {
  const name = monthName(m);
  if (name === 'juillet') return 'juil.';
  return name.length > 4 ? name.slice(0, 3) + '.' : name;
}

/** French elision: « d'octobre », « de mai ». */
export const ofMonth = (m: Month): string =>
  (/^[aeio]/.test(monthName(m)) ? "d'" : 'de ') + monthName(m);

export const dayLabel = (d: Day): string => `${dayOfMonth(d)} ${monthShort(monthOf(d))}`;
export const dayLongLabel = (d: Day): string =>
  `${dayOfMonth(d)} ${monthName(monthOf(d))} ${d.slice(0, 4)}`;

/* ---------- French text input: "22/10/2026" ↔ "2026-10-22", "10/2026" ↔ "2026-10" ---------- */

export const dayToInput = (d: Day | null): string =>
  d ? `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '';
export const monthToInput = (m: Month | null): string =>
  m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : '';

export function parseDayInput(value: string): Day | null {
  const match = value.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!match) return null;
  const [, d = '', m = '', y = ''] = match;
  const day = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isDay(day) ? day : null;
}

export function parseMonthInput(value: string): Month | null {
  const match = value.trim().match(/^(\d{1,2})[/.-](\d{4})$/);
  if (!match) return null;
  const [, m = '', y = ''] = match;
  const month = `${y}-${m.padStart(2, '0')}`;
  return isMonth(month) ? month : null;
}
