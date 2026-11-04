import type { Category } from '@/types/domain';

/** Categorical palette checked for contrast on light and dark backgrounds. */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'logement', name: 'Logement', color: '#2a78d6', need: true },
  { id: 'alimentation', name: 'Alimentation', color: '#008300', need: true },
  { id: 'transport', name: 'Transport', color: '#1baf7a', need: true },
  { id: 'assurance', name: 'Assurances', color: '#eb6834', need: true },
  { id: 'pret', name: 'Prêts & études', color: '#e87ba4', need: true },
  { id: 'abonnements', name: 'Abonnements & télécom', color: '#eda100', need: false },
  { id: 'sante', name: 'Santé & sport', color: '#4a3aa7', need: false },
  { id: 'loisirs', name: 'Loisirs & autre', color: '#e34948', need: false },
];

export const FALLBACK_CATEGORY: Category = {
  id: 'loisirs',
  name: 'Autre',
  color: '#788291',
  need: false,
};

export const CATEGORY_COLORS = [
  '#2a78d6',
  '#008300',
  '#1baf7a',
  '#eb6834',
  '#e87ba4',
  '#eda100',
  '#4a3aa7',
  '#e34948',
  '#0e7490',
  '#a16207',
  '#7c3aed',
  '#64748b',
] as const;

export function categoryOf(categories: readonly Category[], id: string | null): Category {
  return categories.find(c => c.id === id) ?? FALLBACK_CATEGORY;
}
