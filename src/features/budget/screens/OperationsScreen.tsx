import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Checkbox,
  Divider,
  EmptyState,
  Grid,
  ListRow,
  MonthSwitcher,
  Row,
  Screen,
  Segmented,
  Stat,
} from '@/components';
import { categoryOf } from '@/features/categories/domain/defaults';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space, useColors } from '@/theme';
import { dayLabel, monthLabel, monthOf, monthToInput } from '@/utils/dates';
import { formatMoney, formatMoneySigned } from '@/utils/money';
import { setPaid } from '../domain/actions';
import { monthStatus, totalsOf, type OccurrenceStatus } from '../domain/occurrences';
import { frequencyLabel } from '../forms/operationForm';

type Filter = 'all' | 'rule' | 'tx';

function OccurrenceRow({ o }: { o: OccurrenceStatus }) {
  const state = useBudget();
  const c = useColors();
  const category = o.kind === 'exp' ? categoryOf(state.categories, o.categoryId) : null;
  const status = o.locked ? 'compris dans le solde' : o.paid ? 'passé' : 'à venir';
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
          subtitle={[
            dayLabel(o.date),
            category?.name ?? 'Revenu',
            o.source === 'rule' ? 'récurrent' : null,
            status,
          ]
            .filter(Boolean)
            .join(' · ')}
          left={
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: category?.color ?? c.inc,
              }}
            />
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
  const [month, setMonth] = useState(monthOf(today));
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(() => monthStatus(state, month), [state, month]);
  const shown = list.filter(o => filter === 'all' || o.source === filter);
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
      <MonthSwitcher month={month} onChange={setMonth} />
      <Row style={{ flexWrap: 'wrap', gap: space.md }}>
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
            shown.map((o, i) => (
              <View key={o.key}>
                {i > 0 ? <Divider /> : null}
                <OccurrenceRow o={o} />
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
