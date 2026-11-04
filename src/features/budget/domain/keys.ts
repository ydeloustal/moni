import type { Month } from '@/utils/dates';

/** Key of one occurrence of a recurring rule in a given month: "ruleId|YYYY-MM". */
export const ruleKey = (ruleId: string, month: Month): string => `${ruleId}|${month}`;
/** Key of a one-off operation: "t:txId". */
export const txKey = (txId: string): string => `t:${txId}`;

export const isTxKey = (key: string): boolean => key.startsWith('t:');

/** Splits a rule key; null for a one-off key or a malformed key. */
export function parseRuleKey(key: string): { ruleId: string; month: Month } | null {
  if (isTxKey(key)) return null;
  const sep = key.indexOf('|');
  if (sep <= 0) return null;
  return { ruleId: key.slice(0, sep), month: key.slice(sep + 1) };
}

/** Accepted key format (validation of imported or stored data). */
export const OCCURRENCE_KEY = /^(?:[\w-]{1,32}\|\d{4}-(?:0[1-9]|1[0-2])|t:[\w-]{1,32})$/;
