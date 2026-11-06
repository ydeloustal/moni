import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  Card,
  Divider,
  Grid,
  Hero,
  Legend,
  LineChart,
  Row,
} from '@/components';
import { projection } from '@/features/budget/domain/projection';
import { useBudget } from '@/hooks/useBudget';
import { space, useColors } from '@/theme';
import { monthLabel, monthShort } from '@/utils/dates';
import { formatMoney, formatMoneyRounded } from '@/utils/money';

/** Next 12 months: prudent savings plan and expected end-of-month balances. */
export function ForecastPanel() {
  const state = useBudget();
  const c = useColors();
  const plan = useMemo(() => projection(state, 12), [state]);
  const last = plan[plan.length - 1];
  const total = last?.savedCumul ?? 0;
  const red = plan.filter(p => p.endBalance < 0);
  const tight = plan.find(p => p.endBalance >= 0 && p.save === 0);

  return (
    <View style={{ gap: space.lg }}>
      <Grid max={2}>
        <Hero>
          <AppText tone="heroMuted">Épargnable sur 12 mois</AppText>
          <AppText variant="hero" tone="heroGood" numeric>
            {formatMoneyRounded(total)}
          </AppText>
          <AppText variant="caption" tone="heroMuted">
            {`Plan prudent : le compte ne descend jamais sous ${formatMoneyRounded(state.settings.buffer)} de marge.`}
          </AppText>
          <Button
            small
            label="Changer la marge"
            onPress={() => router.push('/settings')}
            style={{ alignSelf: 'flex-start', marginTop: space.sm }}
          />
        </Hero>
        <View style={{ gap: space.lg }}>
          {red.length > 0 ? (
            <Banner
              tone="bad"
              title={`${red.length} mois dans le rouge`}
            >{`Premier : ${monthLabel(red[0]?.month ?? '')}, avec ${formatMoney(red[0]?.endBalance ?? 0)} en fin de mois.`}</Banner>
          ) : tight ? (
            <Banner
              tone="warn"
              title={`${monthLabel(tight.month).replace(/^./, x => x.toUpperCase())} est serré`}
            >
              Rien à mettre de côté ce mois-là sans entamer ta marge. Rien n’est en négatif.
            </Banner>
          ) : (
            <Banner tone="good" title="Aucun mois dans le rouge">
              Sur les 12 prochains mois, le compte reste au-dessus de ta marge.
            </Banner>
          )}
        </View>
      </Grid>

      <Card title="Fin de mois prévue">
        <LineChart
          labels={plan.map(p => monthShort(p.month))}
          every={2}
          series={[
            { color: c.inc, values: plan.map(p => p.endBalance / 100) },
            { color: c.save, values: plan.map(p => p.savedCumul / 100), area: true },
          ]}
          description={`Fin ${last ? monthLabel(last.month) : ''} : solde prévu ${formatMoney(
            last?.endBalance ?? 0,
          )}, dont ${formatMoney(total)} d’épargne possible.`}
        />
        <Legend
          items={[
            { color: c.inc, label: 'Solde prévu en fin de mois' },
            { color: c.save, label: 'Épargne possible cumulée' },
          ]}
        />
      </Card>

      <Card title="Mois par mois">
        <Row style={{ paddingVertical: space.xs }}>
          <AppText variant="caption" tone="muted" weight="700" style={{ flex: 1 }}>
            MOIS
          </AppText>
          <AppText
            variant="caption"
            tone="muted"
            weight="700"
            align="right"
            style={{ minWidth: 96 }}
          >
            FIN DE MOIS
          </AppText>
          <AppText
            variant="caption"
            tone="muted"
            weight="700"
            align="right"
            style={{ minWidth: 96 }}
          >
            ÉPARGNABLE
          </AppText>
        </Row>
        {plan.map((p, i) => (
          <View key={p.month}>
            {i > 0 ? <Divider /> : null}
            <Row
              style={{ paddingVertical: space.sm }}
              accessible
              accessibilityLabel={`${monthLabel(p.month)} : fin de mois ${formatMoney(p.endBalance)}, épargnable ${formatMoney(p.save)}`}
            >
              <AppText style={{ flex: 1 }}>{monthLabel(p.month)}</AppText>
              <AppText
                numeric
                tone={p.endBalance < 0 ? 'bad' : 'ink2'}
                align="right"
                style={{ minWidth: 96 }}
              >
                {formatMoneyRounded(p.endBalance)}
              </AppText>
              <AppText
                numeric
                weight="700"
                tone={p.save ? 'good' : 'muted'}
                align="right"
                style={{ minWidth: 96 }}
              >
                {p.save ? formatMoneyRounded(p.save) : '—'}
              </AppText>
            </Row>
          </View>
        ))}
      </Card>
    </View>
  );
}
