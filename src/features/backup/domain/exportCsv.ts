import { categoryOf } from '@/features/categories/domain/defaults';
import type { BudgetState, Frequency } from '@/types/domain';
import { toCsvText } from '@/utils/csv';

const amount = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',');

const FREQUENCY_LABELS: Record<Frequency, string> = {
  1: 'mensuelle',
  2: 'tous les 2 mois',
  3: 'trimestrielle',
  6: 'semestrielle',
  12: 'annuelle',
};

/** CSV export of the operations (recurring lines and one-off operations). */
export function toCsv(state: BudgetState): string {
  const rows: unknown[][] = [
    [
      'genre',
      'type',
      'nom',
      'montant',
      'categorie',
      'date_ou_jour',
      'periodicite',
      'debut',
      'fin',
      'actif',
      'abonnement',
      'remarque',
    ],
  ];
  for (const r of state.rules) {
    rows.push([
      'recurrent',
      r.kind === 'inc' ? 'revenu' : 'depense',
      r.name,
      amount(r.amount),
      r.kind === 'inc' ? '' : categoryOf(state.categories, r.categoryId).name,
      r.day,
      FREQUENCY_LABELS[r.every],
      r.from ?? '',
      r.to ?? '',
      r.active ? 'oui' : 'non',
      r.subscription ? 'oui' : 'non',
      r.note,
    ]);
  }
  for (const t of [...state.txs].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      'ponctuel',
      t.kind === 'inc' ? 'revenu' : 'depense',
      t.name,
      amount(t.amount),
      t.kind === 'inc' ? '' : categoryOf(state.categories, t.categoryId).name,
      t.date,
      '',
      '',
      '',
      '',
      '',
      t.note,
    ]);
  }
  return toCsvText(rows);
}
