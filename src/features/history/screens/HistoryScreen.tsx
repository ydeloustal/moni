import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  BarChart,
  Card,
  CategoryBars,
  Divider,
  EmptyState,
  Grid,
  Legend,
  Row,
  Screen,
  Segmented,
  Stat,
} from '@/components';
import { monthTotals } from '@/features/budget/domain/occurrences';
import { cutSimulation } from '@/features/insights/domain/insights';
import { useBudget } from '@/hooks/useBudget';
import { useLayout } from '@/hooks/useLayout';
import { useToday } from '@/hooks/useToday';
import type { HistoryRange } from '@/services/preferences/preferences';
import { space, useColors, useTheme } from '@/theme';
import { addMonths, monthLabel, monthOf, monthShort } from '@/utils/dates';
import { formatMoney, formatMoneyRounded, formatMoneySigned } from '@/utils/money';
import {
  averages,
  expenseTrend,
  expensesByCategory,
  forecastRows,
  history,
} from '../domain/history';
import { ForecastPanel } from '../components/ForecastPanel';

type Period = 'past' | 'future';

export function HistoryScreen() {
  const state = useBudget();
  const today = useToday();
  const c = useColors();
  const { preferences, setPreferences } = useTheme();
  const range: HistoryRange = preferences.historyRange;
  const [view, setView] = useState<'forecast' | 'history'>('forecast');
  const { sideNavigation } = useLayout();
  const [period, setPeriod] = useState<Period>('past');
  const current = monthOf(today);
  const rows = useMemo(
    () =>
      period === 'past'
        ? history(state, current, range)
        : forecastRows(state, addMonths(current, 1), range),
    [state, current, range, period],
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const index =
    selectedIndex !== null && selectedIndex < rows.length
      ? selectedIndex
      : period === 'past'
        ? rows.length - 1
        : 0;
  const selected = rows[index];
  const avg = averages(rows);
  const trend = selected ? expenseTrend(state, selected.month) : null;
  const byCategory = useMemo(
    () =>
      expensesByCategory(
        state,
        rows.map(r => r.month),
      ),
    [state, rows],
  );
  const selectedByCategory = useMemo(
    () => (selected ? expensesByCategory(state, [selected.month]) : []),
    [state, selected],
  );
  const cuts = useMemo(() => cutSimulation(state), [state]);
  const hasData = state.rules.length > 0 || state.txs.length > 0;

  const header = (
    <>
      {sideNavigation ? null : (
        <AppText variant="h1" accessibilityRole="header">
          Prévisions
        </AppText>
      )}
      <Segmented
        label="Vue"
        value={view}
        onChange={setView}
        options={[
          { value: 'forecast', label: '12 prochains mois' },
          { value: 'history', label: 'Historique' },
        ]}
      />
    </>
  );

  if (hasData && view === 'forecast') {
    return (
      <Screen>
        {header}
        <ForecastPanel />
      </Screen>
    );
  }

  if (!hasData) {
    return (
      <Screen>
        {header}
        <EmptyState icon="chart" title="Pas encore d’historique">
          Ajoute tes revenus et dépenses : l’historique et les statistiques apparaîtront ici.
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <Row style={{ flexWrap: 'wrap', gap: space.lg, alignItems: 'flex-end' }}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Segmented
            label="Période"
            value={period}
            onChange={v => {
              setPeriod(v);
              setSelectedIndex(null);
            }}
            options={[
              { value: 'past', label: 'Mois passés' },
              { value: 'future', label: 'Mois à venir' },
            ]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Segmented
            label="Durée"
            value={range}
            onChange={v => {
              setPreferences({ historyRange: v });
              setSelectedIndex(null);
            }}
            options={[
              { value: 6, label: '6 mois' },
              { value: 12, label: '12 mois' },
            ]}
          />
        </View>
      </Row>

      <Grid max={2}>
        <Card title="Revenus et dépenses" subtitle="Touche un mois pour voir son détail.">
          <BarChart
            labels={rows.map(r => monthShort(r.month))}
            series={[
              { color: c.inc, values: rows.map(r => r.inc / 100) },
              { color: c.exp, values: rows.map(r => r.exp / 100) },
            ]}
            selected={index}
            onSelect={setSelectedIndex}
            description={`Revenus et dépenses de ${monthLabel(rows[0]?.month ?? current)} à ${monthLabel(
              rows[rows.length - 1]?.month ?? current,
            )}. Moyenne : ${formatMoneyRounded(avg.inc)} de revenus, ${formatMoneyRounded(avg.exp)} de dépenses par mois.`}
          />
          <Legend
            items={[
              { color: c.inc, label: 'Revenus' },
              { color: c.exp, label: 'Dépenses' },
            ]}
          />
          <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
            <Stat label="Revenus moyens" value={formatMoneyRounded(avg.inc)} />
            <Stat label="Dépenses moyennes" value={formatMoneyRounded(avg.exp)} />
            <Stat
              label="Reste moyen"
              value={formatMoneySigned(avg.rest)}
              tone={avg.rest < 0 ? 'bad' : 'ink'}
            />
          </Row>
          <View>
            {rows.map((r, i) => (
              <View key={r.month}>
                {i > 0 ? <Divider /> : null}
                <Row
                  style={{ paddingVertical: space.sm }}
                  accessible
                  accessibilityLabel={`${monthLabel(r.month)} : revenus ${formatMoney(r.inc)}, dépenses ${formatMoney(r.exp)}, reste ${formatMoney(r.rest)}`}
                >
                  <AppText style={{ flex: 1 }} weight={i === index ? '700' : '400'}>
                    {monthLabel(r.month)}
                  </AppText>
                  <AppText numeric tone="good" style={{ minWidth: 80 }} align="right">
                    {formatMoneyRounded(r.inc)}
                  </AppText>
                  <AppText numeric style={{ minWidth: 80 }} align="right">
                    {formatMoneyRounded(r.exp)}
                  </AppText>
                  <AppText
                    numeric
                    weight="600"
                    tone={r.rest < 0 ? 'bad' : 'ink'}
                    style={{ minWidth: 80 }}
                    align="right"
                  >
                    {formatMoneySigned(r.rest)}
                  </AppText>
                </Row>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ gap: space.lg }}>
          {selected ? (
            <Card title={monthLabel(selected.month).replace(/^./, x => x.toUpperCase())}>
              <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
                <Stat label="Revenus" value={formatMoney(selected.inc)} tone="good" />
                <Stat label="Dépenses" value={formatMoney(selected.exp)} />
                <Stat
                  label="Reste"
                  value={formatMoneySigned(monthTotals(state, selected.month).rest)}
                />
              </Row>
              <AppText tone="ink2">
                {trend === null
                  ? 'Pas assez d’historique pour comparer avec les 3 mois précédents.'
                  : `Dépenses ${trend >= 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(Math.round(trend))} % par rapport à la moyenne des 3 mois précédents.`}
              </AppText>
              {selectedByCategory.length ? <CategoryBars rows={selectedByCategory} /> : null}
            </Card>
          ) : null}
          <Card title="Dépenses par catégorie" subtitle={`Sur les ${range} mois affichés`}>
            {byCategory.length ? (
              <CategoryBars rows={byCategory} />
            ) : (
              <AppText tone="muted">Aucune dépense.</AppText>
            )}
          </Card>
          {cuts.withCuts !== cuts.withoutCuts ? (
            <Card
              title="Lignes coupées"
              subtitle="Simulation « et si j’arrêtais ça ? » sur 12 mois"
            >
              <AppText>
                {`Les lignes coupées représentent ${formatMoney(Math.abs(cuts.withCuts - cuts.withoutCuts))} sur 12 mois.`}
              </AppText>
            </Card>
          ) : null}
        </View>
      </Grid>
    </Screen>
  );
}
