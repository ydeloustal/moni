import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  closeModal,
  ModalScreen,
  Segmented,
  TextField,
  useConfirm,
} from '@/components';
import type { InteractionState } from '@/components/pressable';
import { commit, useBudget } from '@/hooks/useBudget';
import { space, useColors } from '@/theme';
import { addCategory, categoryUsage, deleteCategory, updateCategory } from '../domain/actions';
import { CATEGORY_COLORS } from '../domain/defaults';

export function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const state = useBudget();
  const c = useColors();
  const confirm = useConfirm();
  const existing = state.categories.find(x => x.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState<string>(existing?.color ?? CATEGORY_COLORS[0]);
  const [need, setNeed] = useState(existing?.need ?? false);
  const others = state.categories.filter(x => x.id !== existing?.id);
  const [replacement, setReplacement] = useState(others[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const close = () => closeModal('/settings');

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Donne un nom à cette catégorie.');
      return;
    }
    const input = { name: trimmed.slice(0, 40), color, need };
    if (existing) commit(s => updateCategory(s, existing.id, input), 'Catégorie modifiée');
    else commit(s => addCategory(s, input), 'Catégorie ajoutée');
    close();
  }

  async function remove() {
    if (!existing) return;
    const used = categoryUsage(state, existing.id);
    const target = others.find(o => o.id === replacement);
    const ok = await confirm({
      title: `Supprimer « ${existing.name} » ?`,
      message:
        used && target
          ? `${used} ligne(s) ou opération(s) seront déplacées dans « ${target.name} ».`
          : undefined,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    commit(s => deleteCategory(s, existing.id, target?.id ?? null), 'Catégorie supprimée');
    close();
  }

  return (
    <ModalScreen
      title={existing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      onClose={close}
      footer={
        <>
          {existing && others.length > 0 ? (
            <Button kind="danger" icon="trash" label="Supprimer" onPress={() => void remove()} />
          ) : null}
          <Button kind="primary" label="Enregistrer" onPress={save} style={{ flexGrow: 1 }} />
        </>
      }
    >
      <TextField
        label="Nom"
        value={name}
        onChangeText={v => {
          setName(v);
          setError(null);
        }}
        maxLength={40}
        error={error}
        autoFocus={!existing}
      />
      <Segmented
        label="Nature (repère 50 / 30 / 20)"
        value={need ? 'need' : 'want'}
        onChange={v => setNeed(v === 'need')}
        options={[
          { value: 'need', label: 'Besoin' },
          { value: 'want', label: 'Envie' },
        ]}
      />
      <View style={{ gap: space.xs }}>
        <AppText variant="label" tone="ink2">
          Couleur
        </AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Couleur" style={styles.colors}>
          {CATEGORY_COLORS.map((value, i) => (
            <Pressable
              key={value}
              onPress={() => setColor(value)}
              accessibilityRole="radio"
              accessibilityLabel={`Couleur ${i + 1}`}
              accessibilityState={{ selected: value === color, checked: value === color }}
              style={(s: InteractionState) => [
                styles.swatch,
                {
                  backgroundColor: value,
                  borderColor: value === color || s.focused ? c.ink : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      </View>
      {existing && categoryUsage(state, existing.id) > 0 && others.length > 0 ? (
        <Segmented
          label="En cas de suppression, déplacer les opérations vers"
          value={replacement}
          onChange={setReplacement}
          options={others.map(o => ({ value: o.id, label: o.name }))}
          wrap
        />
      ) : null}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
});
