import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  closeModal,
  ModalScreen,
  Segmented,
  TextField,
  Toggle,
  useConfirm,
} from '@/components';
import { CategoryPicker } from '@/features/categories/components/CategoryPicker';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space } from '@/theme';
import type { Kind } from '@/types/domain';
import { monthLabel, monthOf, monthToInput, parseMonthInput } from '@/utils/dates';
import {
  addRule,
  addTx,
  deleteRule,
  deleteTx,
  duplicateRule,
  duplicateTx,
  updateRule,
  updateRuleFrom,
  updateTx,
} from '../domain/actions';
import {
  emptyOperationForm,
  FREQUENCY_OPTIONS,
  ruleToForm,
  txToForm,
  validateOperation,
  type Nature,
  type OperationErrors,
  type OperationFormValues,
} from '../forms/operationForm';

type Scope = 'all' | 'from';

export function OperationScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    source?: Nature;
    kind?: Kind;
    month?: string;
  }>();
  const state = useBudget();
  const today = useToday();
  const confirm = useConfirm();

  const existingRule =
    params.source !== 'tx' ? state.rules.find(r => r.id === params.id) : undefined;
  const existingTx = params.source !== 'rule' ? state.txs.find(t => t.id === params.id) : undefined;
  const editing = !!(existingRule || existingTx);

  const initial = useMemo<OperationFormValues>(() => {
    if (existingRule) return ruleToForm(existingRule, today);
    if (existingTx) return txToForm(existingTx, today);
    return emptyOperationForm(
      today,
      params.source === 'tx' ? 'tx' : 'rule',
      params.kind === 'inc' ? 'inc' : 'exp',
    );
    // The form is initialised once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [values, setValues] = useState<OperationFormValues>(initial);
  const [errors, setErrors] = useState<OperationErrors>({});
  const [scope, setScope] = useState<Scope>('all');
  const [fromMonth, setFromMonth] = useState(monthToInput(params.month ?? monthOf(today)));
  const [fromError, setFromError] = useState<string | null>(null);

  const set = <K extends keyof OperationFormValues>(key: K, value: OperationFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };
  const close = () => closeModal('/operations');

  function save() {
    const result = validateOperation(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (result.nature === 'tx') {
      const input = result.input;
      if (existingTx) commit(s => updateTx(s, existingTx.id, input), 'Opération modifiée');
      else commit(s => addTx(s, input, today), 'Opération ajoutée');
    } else {
      const input = result.input;
      if (existingRule) {
        if (scope === 'from') {
          const month = parseMonthInput(fromMonth);
          if (!month) {
            setFromError('Mois au format MM/AAAA.');
            return;
          }
          commit(
            s => updateRuleFrom(s, existingRule.id, month, input),
            `Modifiée à partir de ${monthLabel(month)}`,
          );
        } else {
          commit(s => updateRule(s, existingRule.id, input), 'Ligne modifiée');
        }
      } else {
        commit(s => addRule(s, input), 'Ligne récurrente ajoutée');
      }
    }
    close();
  }

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer cette opération ?',
      message: existingRule
        ? 'La ligne disparaît de tous les mois, passés compris. Pour arrêter une ligne sans changer le passé, renseigne plutôt un dernier mois.'
        : undefined,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    if (existingRule) commit(s => deleteRule(s, existingRule.id), 'Ligne supprimée');
    if (existingTx) commit(s => deleteTx(s, existingTx.id), 'Opération supprimée');
    close();
  }

  function duplicate() {
    if (existingRule) commit(s => duplicateRule(s, existingRule.id), 'Ligne dupliquée');
    if (existingTx) commit(s => duplicateTx(s, existingTx.id, today), 'Opération dupliquée');
    close();
  }

  const title = editing
    ? values.nature === 'rule'
      ? 'Modifier la ligne récurrente'
      : 'Modifier l’opération'
    : 'Nouvelle opération';

  return (
    <ModalScreen
      title={title}
      onClose={close}
      footer={
        <>
          {editing ? (
            <>
              <Button kind="danger" icon="trash" label="Supprimer" onPress={() => void remove()} />
              <Button icon="copy" label="Dupliquer" onPress={duplicate} />
            </>
          ) : null}
          <Button kind="primary" label="Enregistrer" onPress={save} testID="operation-save" />
        </>
      }
    >
      {!editing ? (
        <Segmented
          label="Genre"
          value={values.nature}
          onChange={v => set('nature', v)}
          options={[
            { value: 'rule', label: 'Récurrente' },
            { value: 'tx', label: 'Ponctuelle' },
          ]}
        />
      ) : null}
      <Segmented
        label="Type"
        value={values.kind}
        onChange={v => {
          set('kind', v);
          if (v === 'exp' && !values.categoryId) set('categoryId', 'alimentation');
        }}
        options={[
          { value: 'exp', label: 'Dépense' },
          { value: 'inc', label: 'Revenu' },
        ]}
      />
      <TextField
        label="Nom"
        value={values.name}
        onChangeText={v => set('name', v)}
        maxLength={80}
        placeholder={values.kind === 'inc' ? 'Salaire, aide, prime…' : 'Loyer, courses, téléphone…'}
        error={errors.name}
        autoFocus={!editing}
        testID="operation-name"
      />
      <TextField
        label="Montant"
        value={values.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
        suffix="€"
        placeholder="0,00"
        error={errors.amount}
        testID="operation-amount"
      />
      {values.kind === 'exp' ? (
        <CategoryPicker
          categories={state.categories}
          value={values.categoryId}
          onChange={id => set('categoryId', id)}
        />
      ) : null}

      {values.nature === 'tx' ? (
        <TextField
          label="Date"
          value={values.date}
          onChangeText={v => set('date', v)}
          placeholder="JJ/MM/AAAA"
          keyboardType="numbers-and-punctuation"
          hint="Une opération déjà passée est cochée automatiquement."
          error={errors.date}
        />
      ) : (
        <>
          <TextField
            label="Jour du mois"
            value={values.day}
            onChangeText={v => set('day', v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            hint="31 = dernier jour du mois."
            error={errors.day}
          />
          <Segmented
            label="Fréquence"
            value={values.every}
            onChange={v => set('every', v)}
            options={FREQUENCY_OPTIONS}
            wrap
          />
          {values.every !== 1 ? (
            <TextField
              label="Mois d’une échéance"
              value={values.anchor}
              onChangeText={v => set('anchor', v)}
              placeholder="MM/AAAA"
              keyboardType="numbers-and-punctuation"
              hint="Les échéances suivantes en sont déduites."
              error={errors.anchor}
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <TextField
                label="Premier mois (facultatif)"
                value={values.from}
                onChangeText={v => set('from', v)}
                placeholder="MM/AAAA"
                keyboardType="numbers-and-punctuation"
                error={errors.from}
              />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <TextField
                label="Dernier mois (facultatif)"
                value={values.to}
                onChangeText={v => set('to', v)}
                placeholder="MM/AAAA"
                keyboardType="numbers-and-punctuation"
                error={errors.to}
              />
            </View>
          </View>
          {values.kind === 'exp' ? (
            <Toggle
              label="Abonnement"
              hint="Affiché dans la vue Abonnements (coût par mois et par an)."
              value={values.subscription}
              onChange={v => set('subscription', v)}
            />
          ) : null}
          <Toggle
            label="Comptée dans le budget"
            hint="Désactive-la pour simuler « et si j’arrêtais ça ? » sans la supprimer."
            value={values.active}
            onChange={v => set('active', v)}
          />
          {existingRule ? (
            <View style={{ gap: space.md }}>
              <Segmented
                label="Appliquer la modification"
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: 'À tous les mois' },
                  { value: 'from', label: 'À partir d’un mois' },
                ]}
              />
              {scope === 'from' ? (
                <>
                  <TextField
                    label="À partir de"
                    value={fromMonth}
                    onChangeText={v => {
                      setFromMonth(v);
                      setFromError(null);
                    }}
                    placeholder="MM/AAAA"
                    keyboardType="numbers-and-punctuation"
                    error={fromError}
                  />
                  <Banner tone="info" title="Les mois passés restent exacts">
                    La ligne actuelle s’arrête le mois précédent et une nouvelle ligne prend le
                    relais (par exemple une hausse de loyer).
                  </Banner>
                </>
              ) : null}
            </View>
          ) : null}
        </>
      )}
      <TextField
        label="Remarque (facultatif)"
        value={values.note}
        onChangeText={v => set('note', v)}
        maxLength={200}
        multiline
      />
      {editing ? null : (
        <AppText variant="caption" tone="muted">
          Tout reste sur ton appareil.
        </AppText>
      )}
    </ModalScreen>
  );
}
