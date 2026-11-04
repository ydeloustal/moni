import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Card, Legend, LineChart, Row, Stat, TextField } from '@/components';
import { updateSettings } from '@/features/budget/domain/actions';
import { BUNDLED_RATES } from '@/features/savings/domain/bundledRates';
import { rateAt } from '@/features/savings/domain/rates';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space, useColors } from '@/theme';
import {
  formatMoneyRounded,
  formatPercent,
  parseAmount,
  parsePercent,
  percentToInput,
} from '@/utils/money';
import { futureValue, futureValueSeries } from '../domain/simulator';

export function Simulator() {
  const state = useBudget();
  const today = useToday();
  const c = useColors();
  const [monthlyText, setMonthlyText] = useState('100');
  const [yearsText, setYearsText] = useState('5');
  const [altText, setAltText] = useState(percentToInput(state.settings.simAltRate));
  const monthly = parseAmount(monthlyText);
  const years = Math.min(40, Math.max(1, Math.round(Number(yearsText)) || 1));
  const livretA = rateAt(BUNDLED_RATES, 'livret-a', today);
  const rates = [
    ...(livretA.rate !== null
      ? [{ label: `Livret A (${formatPercent(livretA.rate)})`, rate: livretA.rate, color: c.save }]
      : []),
    ...(state.settings.simAltRate !== null
      ? [
          {
            label: `Hypothèse (${formatPercent(state.settings.simAltRate)})`,
            rate: state.settings.simAltRate,
            color: c.inc,
          },
        ]
      : []),
  ];

  return (
    <Card title="Simulateur" subtitle="Ce que deviendrait un versement mensuel régulier.">
      <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField
            label="Versement chaque mois"
            value={monthlyText}
            onChangeText={setMonthlyText}
            keyboardType="decimal-pad"
            suffix="€"
            error={Number.isNaN(monthly) ? 'Montant illisible.' : null}
          />
        </View>
        <View style={{ flex: 1, minWidth: 120 }}>
          <TextField
            label="Pendant (années)"
            value={yearsText}
            onChangeText={v => setYearsText(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
          />
        </View>
      </Row>
      <TextField
        label="Taux de comparaison (facultatif)"
        value={altText}
        onChangeText={v => {
          setAltText(v);
          const p = parsePercent(v);
          commit(s =>
            updateSettings(s, { simAltRate: v.trim() === '' || Number.isNaN(p) ? null : p }),
          );
        }}
        keyboardType="decimal-pad"
        suffix="%"
        hint="Une hypothèse à toi : rien n’est garanti."
      />
      {Number.isNaN(monthly) ? null : (
        <>
          <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
            <Stat label="Versé" value={formatMoneyRounded(monthly * 12 * years)} />
            {rates.map(r => (
              <Stat
                key={r.label}
                label={r.label}
                value={formatMoneyRounded(futureValue(monthly, r.rate, years))}
              />
            ))}
          </Row>
          <LineChart
            labels={Array.from({ length: years + 1 }, (_, i) => `${i} an${i > 1 ? 's' : ''}`)}
            every={Math.ceil((years + 1) / 5)}
            series={[
              {
                color: c.muted,
                values: Array.from({ length: years + 1 }, (_, i) => (monthly * 12 * i) / 100),
                dashed: true,
              },
              ...rates.map(r => ({
                color: r.color,
                values: futureValueSeries(monthly, r.rate, years).map(v => v / 100),
              })),
            ]}
            description={`Projection sur ${years} ans d’un versement de ${formatMoneyRounded(monthly)} par mois.`}
          />
          <Legend
            items={[
              { color: c.muted, label: 'Versements', dashed: true },
              ...rates.map(r => ({ color: r.color, label: r.label })),
            ]}
          />
        </>
      )}
      <AppText variant="caption" tone="muted">
        Simulation à taux constant et capitalisation mensuelle : les taux réels changent dans le
        temps. Ce n’est pas un conseil en investissement.
      </AppText>
    </Card>
  );
}
