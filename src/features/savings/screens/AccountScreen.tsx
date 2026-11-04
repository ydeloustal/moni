import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  closeModal,
  Divider,
  IconButton,
  ModalScreen,
  Row,
  Segmented,
  TextField,
  useConfirm,
} from '@/components';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space } from '@/theme';
import type { SavingsProduct } from '@/types/domain';
import { dayLabel, dayToInput, parseDayInput } from '@/utils/dates';
import { formatMoney, parseAmount } from '@/utils/money';
import {
  addSavings,
  addSavingsMovement,
  deleteSavings,
  deleteSavingsMovement,
  setSavingsBalance,
  updateSavings,
} from '../domain/actions';
import { PRODUCT_LABELS, PRODUCTS, usesCustomRate } from '../domain/interest';
import {
  accountToForm,
  needsRateInput,
  validateAccount,
  type AccountErrors,
  type AccountFormValues,
} from '../forms/accountForm';

function Movements({ accountId }: { accountId: string }) {
  const state = useBudget();
  const today = useToday();
  const account = state.savings.find(a => a.id === accountId);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dayToInput(today));
  const [error, setError] = useState<string | null>(null);
  if (!account) return null;

  function add() {
    const cents = parseAmount(amount);
    const day = parseDayInput(date);
    if (Number.isNaN(cents) || cents <= 0) return setError('Montant supérieur à 0.');
    if (!day) return setError('Date au format JJ/MM/AAAA.');
    if (account && day <= account.balanceDate)
      return setError('La date doit être après celle du solde saisi.');
    commit(
      s =>
        addSavingsMovement(s, accountId, {
          date: day,
          amount: direction === 'in' ? cents : -cents,
        }),
      'Mouvement ajouté',
    );
    setAmount('');
    setError(null);
  }

  return (
    <View style={{ gap: space.md }}>
      <AppText variant="heading">Versements et retraits</AppText>
      <AppText variant="caption" tone="muted">
        Un versement rapporte à partir de la quinzaine suivante ; un retrait cesse de rapporter dès
        le début de la quinzaine en cours.
      </AppText>
      {account.movements.map((m, i) => (
        <View key={m.id}>
          {i > 0 ? <Divider /> : null}
          <Row>
            <AppText style={{ flex: 1 }}>{dayLabel(m.date)}</AppText>
            <AppText numeric weight="600" tone={m.amount >= 0 ? 'good' : 'ink'}>
              {m.amount >= 0 ? '+' : '−'}
              {formatMoney(Math.abs(m.amount))}
            </AppText>
            <IconButton
              icon="trash"
              label={`Supprimer le mouvement du ${dayLabel(m.date)}`}
              onPress={() =>
                commit(s => deleteSavingsMovement(s, accountId, m.id), 'Mouvement supprimé')
              }
            />
          </Row>
        </View>
      ))}
      <Segmented
        label="Mouvement"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'in', label: 'Versement' },
          { value: 'out', label: 'Retrait' },
        ]}
      />
      <Row style={{ flexWrap: 'wrap', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            label="Montant"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            suffix="€"
            error={error}
          />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="JJ/MM/AAAA"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </Row>
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button icon="plus" label="Ajouter le mouvement" onPress={add} />
      </Row>
    </View>
  );
}

export function AccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const state = useBudget();
  const today = useToday();
  const confirm = useConfirm();
  const existing = state.savings.find(a => a.id === id);
  const [values, setValues] = useState<AccountFormValues>(() => accountToForm(existing, today));
  const [errors, setErrors] = useState<AccountErrors>({});
  const set = <K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };
  const close = () => closeModal('/savings');

  function save() {
    const r = validateAccount(values, existing, today);
    if (!r.ok) return setErrors(r.errors);
    if (existing) {
      // A new typed balance absorbs the movements made before its date.
      const input = r.input;
      commit(
        s =>
          setSavingsBalance(
            updateSavings(s, existing.id, input),
            existing.id,
            input.balance,
            input.balanceDate,
          ),
        'Livret modifié',
      );
    } else {
      commit(s => addSavings(s, r.input), 'Livret ajouté');
    }
    close();
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirm({
      title: 'Supprimer ce livret ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    commit(s => deleteSavings(s, existing.id), 'Livret supprimé');
    close();
  }

  return (
    <ModalScreen
      title={existing ? 'Modifier le livret' : 'Nouveau livret'}
      onClose={close}
      footer={
        <>
          {existing ? (
            <Button kind="danger" icon="trash" label="Supprimer" onPress={() => void remove()} />
          ) : null}
          <Button kind="primary" label="Enregistrer" onPress={save} testID="account-save" />
        </>
      }
    >
      <Segmented<SavingsProduct>
        label="Type de compte"
        value={values.product}
        onChange={v => set('product', v)}
        options={PRODUCTS.map(p => ({
          value: p,
          label: PRODUCT_LABELS[p].replace(/ \(.*\)$/, ''),
        }))}
        wrap
      />
      <TextField
        label="Nom (facultatif)"
        value={values.name}
        onChangeText={v => set('name', v)}
        maxLength={60}
        placeholder={PRODUCT_LABELS[values.product]}
      />
      <TextField
        label="Banque (facultatif)"
        value={values.bank}
        onChangeText={v => set('bank', v)}
        maxLength={60}
      />
      <Row style={{ flexWrap: 'wrap', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            label="Solde"
            value={values.balance}
            onChangeText={v => set('balance', v)}
            keyboardType="decimal-pad"
            suffix="€"
            error={errors.balance}
          />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            label="Au"
            value={values.balanceDate}
            onChangeText={v => set('balanceDate', v)}
            placeholder="JJ/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            error={errors.balanceDate}
          />
        </View>
      </Row>
      {values.product === 'pel' ? (
        <TextField
          label="Date d’ouverture"
          value={values.openedOn}
          onChangeText={v => set('openedOn', v)}
          placeholder="JJ/MM/AAAA"
          keyboardType="numbers-and-punctuation"
          hint="Le taux d’un PEL est celui de sa génération, fixé à l’ouverture."
          error={errors.openedOn}
        />
      ) : null}
      {needsRateInput(values.product) ? (
        <TextField
          label={
            values.product === 'pel' ? 'Taux (si la génération n’est pas connue)' : 'Taux annuel'
          }
          value={values.customRate}
          onChangeText={v => set('customRate', v)}
          keyboardType="decimal-pad"
          suffix="%"
          hint={
            values.product === 'livret-jeune'
              ? 'Taux libre, au moins égal à celui du Livret A.'
              : usesCustomRate(values.product)
                ? 'Le taux affiché par ta banque. Moni te rappellera de le vérifier dans 6 mois.'
                : undefined
          }
          error={errors.customRate}
        />
      ) : (
        <Banner tone="info" title="Taux officiel appliqué automatiquement">
          Taux daté et sourcé (Journal officiel), embarqué dans l’application.
        </Banner>
      )}
      {existing ? <Movements accountId={existing.id} /> : null}
    </ModalScreen>
  );
}
