/**
 * Receipt extraction from OCR lines (phase 0 spike: total and date only).
 * Pure: no React, no clock, no storage.
 */
import type { Day } from '@/utils/dates';
import type { Cents } from '@/utils/money';

export interface TextLine {
  text: string;
  /** [x, y, width, height], top-left origin. */
  box: [number, number, number, number];
}

export type Confidence = 'high' | 'medium' | 'low';

export interface Guess<T> {
  value: T;
  confidence: Confidence;
  /** Index of the line the value was read from. */
  line: number;
}

/** Uppercase, no accents, OCR look-alikes fixed inside numbers ("12,5O" → "12,50"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/(?<=\d[.,]?)[O]|[O](?=[.,]?\d)/g, '0')
    .replace(/\s+/g, ' ')
    .trim();
}

// "12,50" "1 234,56" "1.234,56" "12.50" "-3,20". Two decimals required: avoids quantities and codes.
const AMOUNT = /(-?)(\d{1,3}(?:[ .]\d{3})+|\d+)\s?[,.]\s?(\d{2})(?![\d%])/g;

/** Every amount of a line, in cents, in reading order (negative amounts kept as negative). */
export function amountsIn(text: string): Cents[] {
  const out: Cents[] = [];
  for (const m of normalize(text).matchAll(AMOUNT)) {
    const euros = Number(m[2]!.replace(/[ .]/g, ''));
    const cents = euros * 100 + Number(m[3]);
    out.push(m[1] ? -cents : cents);
  }
  return out;
}

/** Score of a line as the "amount paid" label; 0 = not a total line. */
function totalScore(text: string): number {
  const t = normalize(text);
  if (
    /SOUS[- ]?TOTAL|\bHT\b|\bTVA\b|RENDU|REMISE|ECONOMI|FIDELITE|POINTS|TOTAL ARTICLES?/.test(t)
  ) {
    return 0;
  }
  if (/NET A PAYER|A PAYER|TOTAL TTC|MONTANT TTC/.test(t)) return 3;
  if (/\bTOTAL\b/.test(t)) return 2;
  if (/\b(CB|CARTE|CARTE BANCAIRE|VISA|MASTERCARD|PAIEMENT|ESPECES)\b/.test(t)) return 1;
  return 0;
}

/** Amount written to the right of a label line, on the same visual row (columns read as separate lines). */
function amountOnSameRow(lines: readonly TextLine[], index: number): Cents | undefined {
  const [x, y, w, h] = lines[index]!.box;
  const center = y + h / 2;
  let best: { amount: Cents; dx: number } | undefined;
  lines.forEach((other, i) => {
    if (i === index) return;
    const [ox, oy, , oh] = other.box;
    if (ox < x + w * 0.5 || Math.abs(oy + oh / 2 - center) > Math.max(h, oh) * 0.6) return;
    const amount = amountsIn(other.text).at(-1);
    if (amount !== undefined && (!best || ox - x < best.dx)) best = { amount, dx: ox - x };
  });
  return best?.amount;
}

/** Best guess of the amount paid, or null when the text holds no amount at all. */
export function guessTotal(lines: readonly TextLine[]): Guess<Cents> | null {
  let best: { amount: Cents; score: number; line: number } | undefined;
  lines.forEach((line, i) => {
    const score = totalScore(line.text);
    if (score === 0) return;
    const amount = amountsIn(line.text).at(-1) ?? amountOnSameRow(lines, i);
    if (amount === undefined || amount <= 0) return;
    if (!best || score > best.score || (score === best.score && amount > best.amount)) {
      best = { amount, score, line: i };
    }
  });
  if (best) {
    return { value: best.amount, confidence: best.score >= 2 ? 'high' : 'medium', line: best.line };
  }
  // Fallback: the largest amount on the receipt.
  let max: Guess<Cents> | null = null;
  lines.forEach((line, i) => {
    for (const amount of amountsIn(line.text)) {
      if (amount > 0 && (!max || amount > max.value))
        max = { value: amount, confidence: 'low', line: i };
    }
  });
  return max;
}

const DATE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/;

/** First plausible date (day/month/year, French order). */
export function guessDate(lines: readonly TextLine[]): Guess<Day> | null {
  for (let i = 0; i < lines.length; i++) {
    const m = DATE.exec(normalize(lines[i]!.text));
    if (!m) continue;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2099) continue;
    const pad = (n: number) => String(n).padStart(2, '0');
    return { value: `${year}-${pad(month)}-${pad(day)}`, confidence: 'high', line: i };
  }
  return null;
}
