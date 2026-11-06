import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Checkbox,
  Divider,
  EmptyState,
  Grid,
  ListRow,
  DayChip,
  Row,
  Screen,
  Segmented,
  Stat,
} from '@/components';
import { categoryOf } from '@/features/categories/domain/defaults';
import { commit, useBudget } from '@/hooks/useBudget';
import { useLayout } from '@/hooks/useLayout';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import { useToday } from '@/hooks/useToday';
import { space, useColors } from '@/theme';
import { dayLabel, monthLabel, monthOf, monthToInput } from '@/utils/dates';
import { formatMoney, formatMoneySigned } from '@/utils/money';
import { setPaid } from '../domain/actions';
import { overdue } from '../domain/balance';
import { monthStatus, totalsOf, type OccurrenceStatus } from '../domain/occurrences';
import { frequencyLabel } from '../forms/operationForm';

type Filter = 'all' | 'rule' | 'tx';

function OccurrenceRow({ o, late }: { o: OccurrenceStatus; late: boolean }) {
  const state = useBudget();
  const c = useColors();
  const category = o.kind === 'exp' ? categoryOf(state.categories, o.categoryId) : null;
  const status = o.locked
    ? 'compris dans le solde'
    : o.paid
      ? 'passé'
      : late
        ? 'aurait dû passer'
        : 'à venir';
  return (
    <Row style={{ gap: 0 }}>
      <Checkbox
        checked={o.done}
        disabled={o.locked}
        label={`${o.name}, ${formatMoney(o.amount)}, le ${dayLabel(o.date)} : ${status}`}
        onChange={v => commit(s => setPaid(s, o.key, v))}
      />
      <View style={{ flex: 1 }}>
        <ListRow
          title={o.name}
          subtitle={[category?.name ?? 'Revenu', o.source === 'rule' ? 'récurrent' : null, status]
            .filter(Boolean)
            .join(' · ')}
          left={
            <View>
              <DayChip day={o.date} tone={late ? 'warn' : 'default'} />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  top: -2,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: c.surface,
                  backgroundColor: category?.color ?? c.inc,
                }}
              />
            </View>
          }
          right={
            <AppText numeric weight="600" tone={o.kind === 'inc' ? 'good' : 'ink'}>
              {o.kind === 'inc' ? '+' : '−'}
              {formatMoney(o.amount)}
            </AppText>
          }
          accessibilityHint="Ouvre l’opération pour la modifier"
          onPress={() =>
            router.push({
              pathname: '/operation',
              params: { id: o.id, source: o.source, month: monthToInput(o.month) },
            })
          }
        />
      </View>
    </Row>
  );
}

export function OperationsScreen() {
  const state = useBudget();
  const today = useToday();
  const { sideNavigation } = useLayout();
  const { month } = useSelectedMonth();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(() => monthStatus(state, month), [state, month]);
  const lateKeys = useMemo(() => new Set(overdue(state, today).map(o => o.key)), [state, today]);
  const shown = list.filter(o => filter === 'all' || o.source === filter);
  const upcoming = shown.filter(o => !o.done);
  const passed = shown.filter(o => o.done);
  const totals = totalsOf(list);
  const rules = useMemo(
    () =>
      [...state.rules].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      ),
    [state.rules],
  );

  return (
    <Screen>
      {sideNavigation ? null : (
        <AppText variant="h1" accessibilityRole="header">
          Opérations
        </AppText>
      )}
      <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
        <Stat label="Revenus" value={formatMoney(totals.inc)} tone="good" />
        <Stat label="Dépenses" value={formatMoney(totals.exp)} />
        <Stat
          label="Reste"
          value={formatMoneySigned(totals.rest)}
          tone={totals.rest < 0 ? 'bad' : 'ink'}
        />
      </Row>
      <Grid max={2}>
        <Card
          title={`Opérations ${month === monthOf(today) ? 'du mois' : `de ${monthLabel(month)}`}`}
          subtitle="Coche ce qui est déjà passé sur ton compte."
        >
          <Segmented
            label="Afficher"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tout' },
              { value: 'rule', label: 'Récurrent' },
              { value: 'tx', label: 'Ponctuel' },
            ]}
          />
          {shown.length === 0 ? (
            <EmptyState
              icon="list"
              title="Aucune opération ce mois-ci"
              action={{
                label: 'Ajouter',
                onPress: () => router.push({ pathname: '/operation', params: { source: 'tx' } }),
              }}
            >
              Ajoute une dépense ou un revenu ponctuel, ou une ligne qui revient chaque mois.
            </EmptyState>
          ) : (
            [
              { title: 'À venir', items: upcoming },
              { title: 'Déjà passé', items: passed },
            ]
              .filter(g => g.items.length > 0)
              .map(g => (
                <View key={g.title}>
                  <AppText variant="caption" tone="muted" weight="700" style={styles.section}>
                    {g.title.toUpperCase()}
                  </AppText>
                  {g.items.map((o, i) => (
                    <View key={o.key}>
                      {i > 0 ? <Divider /> : null}
                      <OccurrenceRow o={o} late={lateKeys.has(o.key)} />
                    </View>
                  ))}
                </View>
              ))
          )}
        </Card>
        <View style={{ gap: space.lg }}>
          <Card
            title="Lignes récurrentes"
            subtitle={`${state.rules.filter(r => r.active).length} comptée(s) sur ${state.rules.length}`}
            right={
              <Button
                small
                icon="plus"
                label="Ligne"
                accessibilityLabel="Ajouter une ligne récurrente"
                onPress={() => router.push({ pathname: '/operation', params: { source: 'rule' } })}
              />
            }
          >
            {rules.length === 0 ? (
              <AppText tone="muted">
                Salaire, loyer, abonnements… saisis-les une fois, Moni les reporte chaque mois.
              </AppText>
            ) : (
              rules.map((r, i) => (
                <View key={r.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={r.active ? r.name : `${r.name} (coupée)`}
                    subtitle={[
                      `le ${r.day === 31 ? 'dernier jour' : r.day}`,
                      frequencyLabel(r.every).toLowerCase(),
                      r.from ? `dès ${monthLabel(r.from)}` : null,
                      r.to ? `jusqu’à ${monthLabel(r.to)}` : null,
                      r.subscription ? 'abonnement' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    right={
                      <AppText
                        numeric
                        weight="600"
                        tone={!r.active ? 'muted' : r.kind === 'inc' ? 'good' : 'ink'}
                      >
                        {r.kind === 'inc' ? '+' : '−'}
                        {formatMoney(r.amount)}
                      </AppText>
                    }
                    onPress={() =>
                      router.push({
                        pathname: '/operation',
                        params: { id: r.id, source: 'rule', month: monthToInput(month) },
                      })
                    }
                  />
                </View>
              ))
            )}
          </Card>
          <Card title="Organisation">
            <ListRow
              title="Abonnements"
              subtitle="Coût lissé par mois et par an"
              onPress={() => router.push('/subscriptions')}
            />
            <Divider />
            <ListRow
              title="Catégories"
              subtitle="Nom, couleur, besoin ou envie"
              onPress={() => router.push('/categories')}
            />
          </Card>
        </View>
      </Grid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { letterSpacing: 0.6, marginTop: space.md, marginBottom: space.xs },
});
