/**
 * Operation form: text values ↔ domain input, with validation messages in French.
 * Pure: tested without rendering.
 */
import type { Frequency, Kind, Rule, Tx } from '@/types/domain';
import {
  dayToInput,
  monthOf,
  monthToInput,
  parseDayInput,
  parseMonthInput,
  type Day,
  type Month,
} from '@/utils/dates';
import { centsToInput, parseAmount } from '@/utils/money';
import type { RuleInput, TxInput } from '../domain/actions';

export type Nature = 'rule' | 'tx';

export interface OperationFormValues {
  nature: Nature;
  kind: Kind;
  name: string;
  amount: string;
  categoryId: string | null;
  note: string;
  /** One-off operation. */
  date: string;
  /** Recurring line. */
  day: string;
  every: Frequency;
  anchor: string;
  from: string;
  to: string;
  active: boolean;
  subscription: boolean;
}

export type OperationErrors = Partial<Record<keyof OperationFormValues, string>>;

export type ValidatedOperation =
  | { ok: true; nature: 'rule'; input: RuleInput }
  | { ok: true; nature: 'tx'; input: TxInput }
  | { ok: false; errors: OperationErrors };

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 1, label: 'Mensuelle' },
  { value: 2, label: 'Tous les 2 mois' },
  { value: 3, label: 'Trimestrielle' },
  { value: 6, label: 'Semestrielle' },
  { value: 12, label: 'Annuelle' },
];

export const frequencyLabel = (every: Frequency): string =>
  FREQUENCY_OPTIONS.find(o => o.value === every)?.label ?? '';

export function emptyOperationForm(
  today: Day,
  nature: Nature = 'rule',
  kind: Kind = 'exp',
): OperationFormValues {
  return {
    nature,
    kind,
    name: '',
    amount: '',
    categoryId: kind === 'exp' ? 'alimentation' : null,
    note: '',
    date: dayToInput(today),
    day: String(Number(today.slice(8))),
    every: 1,
    anchor: monthToInput(monthOf(today)),
    from: '',
    to: '',
    active: true,
    subscription: false,
  };
}

export function ruleToForm(rule: Rule, today: Day): OperationFormValues {
  return {
    ...emptyOperationForm(today, 'rule', rule.kind),
    name: rule.name,
    amount: centsToInput(rule.amount),
    categoryId: rule.categoryId,
    note: rule.note,
    day: String(rule.day),
    every: rule.every,
    anchor: monthToInput(rule.anchor),
    from: monthToInput(rule.from),
    to: monthToInput(rule.to),
    active: rule.active,
    subscription: rule.subscription,
  };
}

export function txToForm(tx: Tx, today: Day): OperationFormValues {
  return {
    ...emptyOperationForm(today, 'tx', tx.kind),
    name: tx.name,
    amount: centsToInput(tx.amount),
    categoryId: tx.categoryId,
    note: tx.note,
    date: dayToInput(tx.date),
  };
}

const optionalMonth = (value: string): Month | null | undefined =>
  value.trim() === '' ? null : (parseMonthInput(value) ?? undefined);

export function validateOperation(v: OperationFormValues): ValidatedOperation {
  const errors: OperationErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Donne un nom à cette opération.';
  const amount = parseAmount(v.amount);
  if (Number.isNaN(amount) || amount <= 0)
    errors.amount = 'Entre un montant supérieur à 0, par exemple 12,50.';
  const categoryId = v.kind === 'inc' ? null : v.categoryId;
  const note = v.note.trim().slice(0, 200);

  if (v.nature === 'tx') {
    const date = parseDayInput(v.date);
    if (!date) errors.date = 'Date au format JJ/MM/AAAA.';
    if (Object.keys(errors).length || !date) return { ok: false, errors };
    return {
      ok: true,
      nature: 'tx',
      input: { kind: v.kind, name, amount, categoryId, date, note },
    };
  }

  const day = Number(v.day);
  if (!Number.isInteger(day) || day < 1 || day > 31)
    errors.day = 'Jour entre 1 et 31 (31 = dernier jour du mois).';
  const from = optionalMonth(v.from);
  const to = optionalMonth(v.to);
  if (from === undefined) errors.from = 'Mois au format MM/AAAA, ou laisse vide.';
  if (to === undefined) errors.to = 'Mois au format MM/AAAA, ou laisse vide.';
  let anchor: Month | null = from ?? null;
  if (v.every !== 1) {
    anchor = parseMonthInput(v.anchor);
    if (!anchor) errors.anchor = 'Mois d’une échéance, au format MM/AAAA.';
  }
  if (from && to && to < from) errors.to = 'Le dernier mois doit être après le premier.';
  if (Object.keys(errors).length || from === undefined || to === undefined)
    return { ok: false, errors };
  return {
    ok: true,
    nature: 'rule',
    input: {
      kind: v.kind,
      name,
      amount,
      categoryId,
      day,
      every: v.every,
      anchor: anchor ?? from ?? '2000-01',
      from,
      to,
      note,
      active: v.active,
      subscription: v.kind === 'exp' && v.subscription,
    },
  };
}
