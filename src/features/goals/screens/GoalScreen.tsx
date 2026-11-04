import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, closeModal, ModalScreen, TextField, useConfirm } from '@/components';
import { commit, useBudget } from '@/hooks/useBudget';
import { centsToInput, parseAmount } from '@/utils/money';
import { addGoal, deleteGoal, updateGoal } from '../domain/goals';

export function GoalScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useBudget().goals.find(g => g.id === id);
  const confirm = useConfirm();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? centsToInput(goal.target) : '');
  const [saved, setSaved] = useState(goal ? centsToInput(goal.saved) : '0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const close = () => closeModal('/savings');

  function save() {
    const t = parseAmount(target);
    const s = parseAmount(saved || '0');
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Donne un nom à cet objectif.';
    if (Number.isNaN(t) || t <= 0) e.target = 'Entre un montant supérieur à 0.';
    if (Number.isNaN(s)) e.saved = 'Montant illisible.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const input = { name: name.trim().slice(0, 80), target: t, saved: s };
    commit(
      st => (goal ? updateGoal(st, goal.id, input) : addGoal(st, input)),
      goal ? 'Objectif modifié' : 'Objectif ajouté',
    );
    close();
  }

  async function remove() {
    if (!goal) return;
    if (
      !(await confirm({
        title: 'Supprimer cet objectif ?',
        confirmLabel: 'Supprimer',
        destructive: true,
      }))
    )
      return;
    commit(st => deleteGoal(st, goal.id), 'Objectif supprimé');
    close();
  }

  return (
    <ModalScreen
      title={goal ? 'Modifier l’objectif' : 'Nouvel objectif'}
      onClose={close}
      footer={
        <>
          {goal ? (
            <Button kind="danger" icon="trash" label="Supprimer" onPress={() => void remove()} />
          ) : null}
          <Button kind="primary" label="Enregistrer" onPress={save} />
        </>
      }
    >
      <TextField
        label="Nom"
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder="Voyage, permis, ordinateur…"
        error={errors.name}
        autoFocus={!goal}
      />
      <TextField
        label="Montant visé"
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
        suffix="€"
        error={errors.target}
      />
      <TextField
        label="Déjà de côté"
        value={saved}
        onChangeText={setSaved}
        keyboardType="decimal-pad"
        suffix="€"
        error={errors.saved}
      />
    </ModalScreen>
  );
}
