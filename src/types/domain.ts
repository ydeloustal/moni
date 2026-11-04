import type { Day, Month } from '@/utils/dates';
import type { Cents } from '@/utils/money';

/** Version of the data format. Any change goes through a migration (storage + import). */
export const SCHEMA_VERSION = 1;

export type Kind = 'inc' | 'exp';
export type Frequency = 1 | 2 | 3 | 6 | 12;

export interface Category {
  id: string;
  name: string;
  /** "#rrggbb". */
  color: string;
  /** Need (true) or want (false), used by the 50/30/20 benchmark. */
  need: boolean;
}

/** Recurring income or expense: salary, rent, subscription… */
export interface Rule {
  id: string;
  kind: Kind;
  name: string;
  amount: Cents;
  /** Category (expenses only; null for income). */
  categoryId: string | null;
  /** Day of the month (1–31; 31 = last day of short months). */
  day: number;
  /** Every `every` months: 1 = monthly, 3 = quarterly, 12 = yearly. */
  every: Frequency;
  /** Reference month of the frequency (an occurrence falls in that month). */
  anchor: Month;
  /** First and last months included (null = unbounded). */
  from: Month | null;
  to: Month | null;
  note: string;
  /** false = "cut" line: kept but not counted (simulation "what if I stopped this?"). */
  active: boolean;
  subscription: boolean;
}

/** Dated one-off operation: groceries on the 12th, refund, bonus… */
export interface Tx {
  id: string;
  kind: Kind;
  name: string;
  amount: Cents;
  categoryId: string | null;
  date: Day;
  note: string;
}

export type SavingsProduct =
  'livret-a' | 'ldds' | 'lep' | 'cel' | 'pel' | 'livret-jeune' | 'livret-bancaire' | 'autre';

export interface SavingsMovement {
  id: string;
  date: Day;
  /** Positive = deposit, negative = withdrawal. */
  amount: Cents;
}

export interface SavingsAccount {
  id: string;
  product: SavingsProduct;
  name: string;
  /** Bank name (optional, stays on the device). */
  bank: string;
  /** Balance typed by the user at `balanceDate`. */
  balance: Cents;
  balanceDate: Day;
  /** User-typed rate (%/year). Required for bank accounts; ignored for regulated products. */
  customRate: number | null;
  /** When the user last checked their bank rate. */
  rateCheckedOn: Day | null;
  /** Opening date (PEL rate depends on its "generation"). */
  openedOn: Day | null;
  /** Deposits and withdrawals after `balanceDate`, sorted by date. */
  movements: SavingsMovement[];
}

export interface Goal {
  id: string;
  name: string;
  target: Cents;
  saved: Cents;
}

export interface Settings {
  /** Current account balance, as read in the bank app, at `balanceDate`. */
  balance: Cents;
  balanceDate: Day;
  /** Safety margin: the savings plan never takes the account below it. */
  buffer: Cents;
  /** Comparison rate of the simulator (user assumption, null = none). */
  simAltRate: number | null;
  /** Date of the last exported backup (for the reminder). */
  lastBackupAt: Day | null;
}

/** Every piece of user data. Immutable: each change produces a new object. */
export interface BudgetState {
  schemaVersion: number;
  rules: Rule[];
  txs: Tx[];
  categories: Category[];
  savings: SavingsAccount[];
  goals: Goal[];
  /**
   * Occurrences included in the typed balance: key → true/false (box ticked or unticked in "Update my balance").
   * Without a key, an occurrence is included when its date ≤ balance date.
   */
  marks: Record<string, boolean>;
  /** Occurrences that went through the account AFTER the balance was typed. */
  paid: Record<string, true>;
  settings: Settings;
}
