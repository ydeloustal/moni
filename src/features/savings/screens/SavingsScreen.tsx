import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  Card,
  Divider,
  EmptyState,
  Grid,
  Hero,
  Legend,
  LineChart,
  ProgressBar,
  Row,
  Screen,
} from '@/components';
import { projection } from '@/features/budget/domain/projection';
import { Simulator } from '@/features/goals/components/Simulator';
import { goalProgress } from '@/features/goals/domain/goals';
import { useBudget } from '@/hooks/useBudget';
import { useLayout } from '@/hooks/useLayout';
import { useToday } from '@/hooks/useToday';
import { space, useColors } from '@/theme';
import { monthLabel, monthShort } from '@/utils/dates';
import { formatMoney, formatMoneyRounded } from '@/utils/money';
import { AccountCard } from '../components/AccountCard';
import { BUNDLED_RATES } from '../domain/bundledRates';
import { savingsBalance } from '../domain/interest';
import { isStale } from '../domain/rates';

export function SavingsScreen() {
  const state = useBudget();
  const today = useToday();
  const c = useColors();
  const { sideNavigation } = useLayout();
  const plan = useMemo(() => projection(state, 12), [state]);
  const total = state.savings.reduce((sum, a) => sum + savingsBalance(a, today), 0);
  const planned = plan[plan.length - 1]?.savedCumul ?? 0;
  const capacity = planned / 12;

  return (
    <Screen>
      {isStale(BUNDLED_RATES, today) ? (
        <Banner tone="warn" title="Révision des taux attendue">
          Les taux réglementés ont peut-être changé : mets l’application à jour. Les quinzaines sans
          taux connu ne sont pas comptées.
        </Banner>
      ) : null}
      {sideNavigation ? null : (
        <AppText variant="h1" accessibilityRole="header">
          Épargne
        </AppText>
      )}
      <Hero>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <AppText tone="heroMuted">{`Épargne totale estimée · ${state.savings.length} compte(s)`}</AppText>
        </Row>
        <AppText
          variant="hero"
          tone="onHero"
          numeric
          accessibilityLabel={`Épargne totale estimée : ${formatMoney(total)}`}
        >
          {formatMoney(total)}
        </AppText>
        <Row style={{ flexWrap: 'wrap', marginTop: space.sm }}>
          <Button
            small
            icon="plus"
            label="Ajouter un livret"
            onPress={() => router.push('/account')}
          />
          <Button small label="Taux et sources" onPress={() => router.push('/rates')} />
        </Row>
      </Hero>
      {state.savings.length === 0 ? (
        <EmptyState
          icon="leaf"
          title="Aucun livret"
          action={{ label: 'Ajouter un livret', onPress: () => router.push('/account') }}
        >
          Livret A, LDDS, LEP, PEL… Moni estime les intérêts selon la règle officielle des
          quinzaines.
        </EmptyState>
      ) : (
        <Grid max={3}>
          {state.savings.map(a => (
            <AccountCard key={a.id} account={a} today={today} />
          ))}
        </Grid>
      )}

      <Grid max={2}>
        <Card
          title="Plan d’épargne prudent"
          subtitle={`Sans jamais passer sous ${formatMoney(state.settings.buffer)} sur le compte courant.`}
        >
          <AppText>
            {planned > 0
              ? `${formatMoneyRounded(planned)} peuvent être mis de côté d’ici ${monthLabel(plan[plan.length - 1]?.month ?? '')}.`
              : 'Pas de capacité d’épargne sur les 12 prochains mois avec le budget actuel.'}
          </AppText>
          <LineChart
            labels={plan.map(p => monthShort(p.month))}
            every={2}
            series={[
              { color: c.save, values: plan.map(p => p.savedCumul / 100), area: true },
              { color: c.inc, values: plan.map(p => p.cash / 100) },
            ]}
            description={`Épargne cumulée prévue : ${formatMoneyRounded(planned)} sur 12 mois.`}
          />
          <Legend
            items={[
              { color: c.save, label: 'Épargne cumulée' },
              { color: c.inc, label: 'Solde du compte courant' },
            ]}
          />
        </Card>

        <Card
          title="Objectifs"
          right={
            <Button
              small
              icon="plus"
              label="Objectif"
              accessibilityLabel="Ajouter un objectif"
              onPress={() => router.push('/goal')}
            />
          }
        >
          {state.goals.length === 0 ? (
            <AppText tone="muted">
              Voyage, permis, ordinateur… fixe-toi un montant et suis ta progression.
            </AppText>
          ) : (
            state.goals.map((g, i) => {
              const p = goalProgress(g, capacity);
              const detail =
                p.status === 'reached'
                  ? 'objectif atteint'
                  : p.status === 'estimated'
                    ? `≈ ${p.months} mois au rythme du plan`
                    : 'pas de capacité d’épargne pour l’instant';
              return (
                <View key={g.id} style={{ gap: space.sm }}>
                  {i > 0 ? <Divider /> : null}
                  <Row>
                    <AppText weight="600" style={{ flex: 1 }}>
                      {g.name}
                    </AppText>
                    <Button
                      small
                      kind="ghost"
                      label="Modifier"
                      accessibilityLabel={`Modifier l’objectif ${g.name}`}
                      onPress={() => router.push({ pathname: '/goal', params: { id: g.id } })}
                    />
                  </Row>
                  <ProgressBar value={p.percent} label={`${g.name} : ${Math.round(p.percent)} %`} />
                  <AppText variant="caption" tone="muted">
                    {`${formatMoneyRounded(g.saved)} sur ${formatMoneyRounded(g.target)} · ${detail}`}
                  </AppText>
                </View>
              );
            })
          )}
        </Card>
      </Grid>
      <Simulator />
    </Screen>
  );
}
