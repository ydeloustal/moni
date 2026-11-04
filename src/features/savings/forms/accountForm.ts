import type { SavingsAccount, SavingsProduct } from '@/types/domain';
import { dayToInput, parseDayInput, type Day } from '@/utils/dates';
import { centsToInput, parseAmount, parsePercent, percentToInput } from '@/utils/money';
import type { SavingsInput } from '../domain/actions';
import { usesCustomRate } from '../domain/interest';

export interface AccountFormValues {
  product: SavingsProduct;
  name: string;
  bank: string;
  balance: string;
  balanceDate: string;
  openedOn: string;
  customRate: string;
}

export type AccountErrors = Partial<Record<keyof AccountFormValues, string>>;

export function accountToForm(account: SavingsAccount | undefined, today: Day): AccountFormValues {
  return {
    product: account?.product ?? 'livret-a',
    name: account?.name ?? '',
    bank: account?.bank ?? '',
    balance: account ? centsToInput(account.balance) : '',
    balanceDate: dayToInput(account?.balanceDate ?? today),
    openedOn: dayToInput(account?.openedOn ?? null),
    customRate: percentToInput(account?.customRate ?? null),
  };
}

/** The rate is typed by the user for free-rate products, and for a PEL whose generation is unknown. */
export const needsRateInput = (product: SavingsProduct): boolean =>
  usesCustomRate(product) || product === 'pel';

export function validateAccount(
  v: AccountFormValues,
  previous: SavingsAccount | undefined,
  today: Day,
): { ok: true; input: SavingsInput } | { ok: false; errors: AccountErrors } {
  const errors: AccountErrors = {};
  const balance = parseAmount(v.balance);
  if (Number.isNaN(balance)) errors.balance = 'Montant illisible, par exemple 1 250,00.';
  const balanceDate = parseDayInput(v.balanceDate);
  if (!balanceDate) errors.balanceDate = 'Date au format JJ/MM/AAAA.';
  const openedOn = v.openedOn.trim() === '' ? null : parseDayInput(v.openedOn);
  if (v.openedOn.trim() !== '' && !openedOn)
    errors.openedOn = 'Date au format JJ/MM/AAAA, ou laisse vide.';
  let customRate: number | null = null;
  if (needsRateInput(v.product) && v.customRate.trim() !== '') {
    customRate = parsePercent(v.customRate);
    if (Number.isNaN(customRate)) errors.customRate = 'Taux entre 0 et 100 %, par exemple 3,25.';
  }
  if (v.product === 'livret-bancaire' && v.customRate.trim() === '') {
    errors.customRate = 'Indique le taux affiché par ta banque.';
  }
  if (Object.keys(errors).length || Number.isNaN(balance) || !balanceDate)
    return { ok: false, errors };
  const rateChanged = customRate !== (previous?.customRate ?? null);
  return {
    ok: true,
    input: {
      product: v.product,
      name: v.name.trim().slice(0, 60),
      bank: v.bank.trim().slice(0, 60),
      balance,
      balanceDate,
      customRate: Number.isNaN(customRate ?? 0) ? null : customRate,
      rateCheckedOn:
        customRate === null ? null : rateChanged ? today : (previous?.rateCheckedOn ?? today),
      openedOn,
    },
  };
}
