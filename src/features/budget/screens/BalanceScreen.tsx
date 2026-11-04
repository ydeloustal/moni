import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  Checkbox,
  closeModal,
  Divider,
  ModalScreen,
  Row,
  TextField,
} from '@/components';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space } from '@/theme';
import { dayLabel, dayToInput, parseDayInput } from '@/utils/dates';
import { centsToInput, formatMoney, formatMoneySigned } from '@/utils/money';
import { setBalance } from '../domain/actions';
import { balanceCandidates, currentBalance, expectedBalance } from '../domain/balance';

/** Signed amount: a balance can be negative (overdraft). */
export function parseSignedAmount(value: string): number {
  const negative = /^\s*[-−]/.test(value);
  const s = value
    .replace(/^\s*[-−]/, '')
    .replace(/[\s  €]/g, '')
    .replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  const cents = Math.round(parseFloat(s) * 100);
  return negative ? -cents : cents;
}

/** Balance update: amount read in the bank app + what already went through (so nothing is counted twice). */
export function BalanceScreen() {
  const state = useBudget();
  const today = useToday();
  const [amount, setAmount] = useState(centsToInput(currentBalance(state)).replace('-', '−'));
  const [date, setDate] = useState(
    dayToInput(today > state.settings.balanceDate ? today : state.settings.balanceDate),
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const day = parseDayInput(date);
  const candidates = useMemo(() => (day ? balanceCandidates(state, day) : []), [state, day]);
  const included = (key: string, fallback: boolean) => overrides[key] ?? fallback;
  const value = parseSignedAmount(amount);
  const expected = expectedBalance(state, candidates, overrides);
  const gap = Number.isNaN(value) ? 0 : value - expected;
  const close = () => closeModal('/');

  function save() {
    if (Number.isNaN(value)) {
      setError(
        'Entre le montant affiché par ta banque, par exemple 625,10 (ou −42,00 en cas de découvert).',
      );
      return;
    }
    if (!day) {
      setError('Date au format JJ/MM/AAAA.');
      return;
    }
    const marks = Object.fromEntries(
      candidates.map(c => [c.key, included(c.key, c.defaultIncluded)]),
    );
    commit(s => setBalance(s, value, day, marks), 'Solde mis à jour');
    close();
  }

  return (
    <ModalScreen
      title="Mettre à jour mon solde"
      onClose={close}
      footer={
        <Button kind="primary" label="Enregistrer le solde" onPress={save} testID="balance-save" />
      }
    >
      <AppText tone="ink2">Ouvre l’appli de ta banque et recopie le solde affiché.</AppText>
      <TextField
        label="Solde sur mon compte"
        value={amount}
        onChangeText={v => {
          setAmount(v);
          setError(null);
        }}
        suffix="€"
        keyboardType="numbers-and-punctuation"
        error={error}
        autoFocus
        testID="balance-amount"
      />
      <TextField
        label="À la date du"
        value={date}
        onChangeText={v => {
          setDate(v);
          setOverrides({});
        }}
        placeholder="JJ/MM/AAAA"
        keyboardType="numbers-and-punctuation"
        error={day ? null : 'Date au format JJ/MM/AAAA.'}
      />
      {!Number.isNaN(value) && day ? (
        gap === 0 ? (
          <Banner tone="good" title="Identique à ce que Moni prévoyait" />
        ) : (
          <Banner tone="warn" title={`Écart de ${formatMoneySigned(gap)}`}>
            {`Moni prévoyait ${formatMoney(expected)} avec les coches ci-dessous : une dépense oubliée, ou une coche à corriger ?`}
          </Banner>
        )
      ) : null}
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">Déjà passé sur ton compte ?</AppText>
        <AppText variant="caption" tone="muted">
          Coche ce qui est déjà compris dans ce solde : ce ne sera pas compté deux fois.
        </AppText>
      </View>
      <View>
        {candidates.length === 0 ? (
          <AppText tone="muted">Aucune opération sur la période.</AppText>
        ) : (
          candidates.map((c, i) => (
            <View key={c.key}>
              {i > 0 ? <Divider /> : null}
              <Row style={{ minHeight: 52 }}>
                <Checkbox
                  checked={included(c.key, c.defaultIncluded)}
                  label={`${c.name}, ${formatMoney(c.amount)}, le ${dayLabel(c.date)} : déjà passé`}
                  onChange={v => setOverrides(o => ({ ...o, [c.key]: v }))}
                />
                <AppText variant="caption" tone="muted" style={{ width: 56 }}>
                  {dayLabel(c.date)}
                </AppText>
                <AppText style={{ flex: 1 }} numberOfLines={1}>
                  {c.name}
                </AppText>
                <AppText numeric weight="600" tone={c.sign > 0 ? 'good' : 'ink'}>
                  {c.sign > 0 ? '+' : '−'}
                  {formatMoney(c.amount)}
                </AppText>
              </Row>
            </View>
          ))
        )}
      </View>
    </ModalScreen>
  );
}
