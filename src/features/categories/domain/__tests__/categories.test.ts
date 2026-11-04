import { rule, state, tx } from '@/test/fixtures';
import { addCategory, categoryUsage, deleteCategory, updateCategory } from '../actions';
import { categoryOf, FALLBACK_CATEGORY } from '../defaults';

describe('categories', () => {
  it('adds and updates a category', () => {
    let s = addCategory(state(), { name: 'Animaux', color: '#0e7490', need: false }, 'pets');
    s = updateCategory(s, 'pets', { need: true });
    expect(categoryOf(s.categories, 'pets')).toEqual({
      id: 'pets',
      name: 'Animaux',
      color: '#0e7490',
      need: true,
    });
  });

  it('reassigns rules and operations to the replacement on deletion', () => {
    const s = state({
      rules: [rule({ id: 'r', amount: 1, categoryId: 'transport' })],
      txs: [tx({ id: 't', amount: 1, date: '2026-10-01', categoryId: 'transport' })],
    });
    expect(categoryUsage(s, 'transport')).toBe(2);
    const d = deleteCategory(s, 'transport', 'loisirs');
    expect(d.categories.find(c => c.id === 'transport')).toBeUndefined();
    expect(d.rules[0]?.categoryId).toBe('loisirs');
    expect(d.txs[0]?.categoryId).toBe('loisirs');
  });

  it('falls back to a neutral category for unknown ids', () => {
    expect(categoryOf([], 'nope')).toBe(FALLBACK_CATEGORY);
  });
});
