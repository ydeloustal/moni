/**
 * Import: Moni data (backup or JSON export) or JSON export of the legacy PHP version (moni.json).
 * The result always goes through sanitizeState().
 */
import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import { SCHEMA_VERSION, type BudgetState } from '@/types/domain';
import { isMonth, type Day } from '@/utils/dates';
import { newId } from '@/utils/id';
import { sanitizeState } from './sanitize';

export interface ImportResult {
  state: BudgetState;
  source: 'moni' | 'legacy-php';
  warnings: string[];
}

type Json = Record<string, unknown>;
const asObject = (v: unknown): Json =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
const asList = (v: unknown): Json[] => (Array.isArray(v) ? v.map(asObject) : []);

const isLegacy = (o: Json): boolean =>
  Array.isArray(o.entries) &&
  Array.isArray(o.goals) &&
  !!o.settings &&
  typeof o.settings === 'object' &&
  !('rules' in o);

/** Euros (number or numeric string) → cents. */
const euros = (v: unknown): number =>
  typeof v === 'number'
    ? Math.round(v * 100)
    : typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))
      ? Math.round(Number(v) * 100)
      : 0;

/** Converts the PHP format (euros, `entries`, `solde`…) to the current model (cents, `rules`…). */
export function fromLegacy(o: Json, today: Day): { raw: unknown; warnings: string[] } {
  const warnings: string[] = [];
  const known = new Set(DEFAULT_CATEGORIES.map(c => c.id));
  const settings = asObject(o.settings);
  const rules = asList(o.entries).map(e => {
    const kind = e.type === 'inc' ? 'inc' : 'exp';
    const from = isMonth(e.from) ? e.from : null;
    const category = typeof e.cat === 'string' && known.has(e.cat) ? e.cat : 'loisirs';
    return {
      id: e.id,
      kind,
      name: e.name,
      amount: euros(e.amount),
      categoryId: kind === 'inc' ? null : category,
      day: e.day,
      every: 1,
      anchor: from ?? '2000-01',
      from,
      to: isMonth(e.to) ? e.to : null,
      note: e.note,
      active: e.active !== false,
      subscription: e.cat === 'abonnements',
    };
  });
  const savings: unknown[] = [];
  const saved = euros(settings.saved);
  if (saved > 0) {
    savings.push({
      id: newId(),
      product: 'autre',
      name: 'Épargne (importée)',
      bank: '',
      balance: saved,
      balanceDate: typeof settings.soldeDate === 'string' ? settings.soldeDate : today,
      customRate: null,
      rateCheckedOn: null,
      openedOn: null,
      movements: [],
    });
    warnings.push(
      "Ton « épargne déjà possédée » a été importée comme un compte « Autre épargne » : précise le type de livret dans l'onglet Épargne pour profiter des taux officiels.",
    );
  }
  if (typeof settings.rateSafe === 'number') {
    warnings.push(
      `L'ancien taux « livret » saisi à la main (${settings.rateSafe} %) n'est plus utilisé : Moni applique désormais les taux officiels datés et sourcés.`,
    );
  }
  return {
    raw: {
      schemaVersion: SCHEMA_VERSION,
      rules,
      txs: [],
      categories: DEFAULT_CATEGORIES,
      savings,
      goals: asList(o.goals).map(g => ({
        id: g.id,
        name: g.name,
        target: euros(g.target),
        saved: euros(g.saved),
      })),
      marks: o.marks ?? {},
      paid: o.paid ?? {},
      settings: {
        balance: euros(settings.solde),
        balanceDate: settings.soldeDate,
        buffer: euros(settings.buffer),
        simAltRate:
          typeof settings.rateRisk === 'number' && settings.rateRisk > 0 ? settings.rateRisk : null,
      },
    },
    warnings,
  };
}

export function importData(data: unknown, today: Day): ImportResult {
  const o = asObject(data);
  if (isLegacy(o)) {
    const { raw, warnings } = fromLegacy(o, today);
    return { state: sanitizeState(raw, today), source: 'legacy-php', warnings };
  }
  return { state: sanitizeState(o, today), source: 'moni', warnings: [] };
}
