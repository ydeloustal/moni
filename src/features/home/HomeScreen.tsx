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
  Legend,
  LineChart,
  Row,
  Screen,
  Stat,
} from '@/components';
import {
  baseMonth,
  currentBalance,
  overdue,
  paidSinceCount,
} from '@/features/budget/domain/balance';
import { monthTotals } from '@/features/budget/domain/occurrences';
import { dailyBalance, perDay, projection } from '@/features/budget/domain/projection';
import { BACKUP_REMINDER_DAYS } from '@/features/backup/services/backupService';
import { insights, type InsightTone } from '@/features/insights/domain/insights';
import { BUNDLED_RATES } from '@/features/savings/domain/bundledRates';
import { isStale } from '@/features/savings/domain/rates';
import { useBudget, useStoreSnapshot } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space, useColors } from '@/theme';
import {
  daysBetween,
  dayLongLabel,
  monthLabel,
  monthOf,
  monthShort,
  monthsBetween,
  ofMonth,
} from '@/utils/dates';
import { formatMoney, formatMoneyRounded, formatMoneySigned } from '@/utils/money';

const BANNER_TONE: Record<InsightTone, 'bad' | 'warn' | 'good' | 'info'> = {
  bad: 'bad',
  warn: 'warn',
  good: 'good',
  info: 'info',
};

function Welcome() {
  return (
    <Card
      title="Bienvenue dans Moni"
      subtitle="Tes données restent sur cet appareil. Aucun compte, aucun serveur."
    >
      <AppText tone="ink2">Pour commencer, deux étapes suffisent :</AppText>
      <AppText tone="ink2">1. Recopie le solde affiché par l’appli de ta banque.</AppText>
      <AppText tone="ink2">
        2. Ajoute ce qui revient chaque mois : salaire, loyer, abonnements…
      </AppText>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button
          kind="primary"
          icon="wallet"
          label="Saisir mon solde"
          onPress={() => router.push('/balance')}
        />
        <Button
          icon="repeat"
          label="Ajouter une ligne récurrente"
          onPress={() => router.push({ pathname: '/operation', params: { source: 'rule' } })}
        />
      </Row>
    </Card>
  );
}

export function HomeScreen() {
  const state = useBudget();
  const { recovered } = useStoreSnapshot();
  const today = useToday();
  const c = useColors();
  const month = monthOf(today);

  const data = useMemo(() => {
    const plan = projection(state, 12);
    const index = Math.max(0, monthsBetween(baseMonth(state), month));
    const row = plan[Math.min(index, plan.length - 1)];
    return {
      plan,
      endOfMonth: row?.endBalance ?? currentBalance(state),
      saveThisMonth: row?.save ?? 0,
      balance: currentBalance(state),
      paidSince: paidSinceCount(state),
      late: overdue(state, today),
      totals: monthTotals(state, month),
      spend: perDay(state, month, today),
      daily: dailyBalance(state, month, today),
      tips: insights(state, month),
    };
  }, [state, month, today]);

  const isEmpty = state.rules.length === 0 && state.txs.length === 0;
  const backupAge = state.settings.lastBackupAt
    ? daysBetween(state.settings.lastBackupAt, today)
    : null;
  const needsBackup = !isEmpty && (backupAge === null || backupAge > BACKUP_REMINDER_DAYS);
  const lastPlanMonth = data.plan[data.plan.length - 1];

  return (
    <Screen>
      {recovered ? (
        <Banner tone="warn" title="Données récupérées">
          Les données enregistrées étaient abîmées : la dernière version saine a été rechargée.
          Vérifie ton solde et tes dernières opérations.
        </Banner>
      ) : null}
      {isStale(BUNDLED_RATES, today) ? (
        <Banner tone="warn" title="Taux des livrets à confirmer">
          Une révision des taux réglementés était attendue : mets l’application à jour.
        </Banner>
      ) : null}
      {data.late.length > 0 ? (
        <Banner
          tone="warn"
          title={`${data.late.length} opération${data.late.length > 1 ? 's' : ''} aurai${data.late.length > 1 ? 'ent' : 't'} dû passer`}
          action={
            <Button small label="Mettre à jour mon solde" onPress={() => router.push('/balance')} />
          }
        >
          {data.late
            .slice(0, 3)
            .map(o => o.name)
            .join(', ') +
            (data.late.length > 3 ? '…' : '') +
            '. Coche-les dans Opérations, ou remets ton solde à jour.'}
        </Banner>
      ) : null}
      {needsBackup ? (
        <Banner
          tone="info"
          title={
            backupAge === null
              ? 'Aucune sauvegarde pour l’instant'
              : `Dernière sauvegarde il y a ${backupAge} jours`
          }
          action={
            <Button small icon="lock" label="Sauvegarder" onPress={() => router.push('/backup')} />
          }
        >
          Sans serveur, une sauvegarde chiffrée est le seul moyen de retrouver tes données si tu
          perds cet appareil.
        </Banner>
      ) : null}

      {isEmpty ? <Welcome /> : null}

      <Grid max={2}>
        <Card
          title="Mon compte"
          subtitle={`Solde saisi au ${dayLongLabel(state.settings.balanceDate)}${
            data.paidSince ? `, ${data.paidSince} opération(s) passée(s) depuis` : ''
          }`}
          right={
            <Button
              small
              label="Mettre à jour"
              onPress={() => router.push('/balance')}
              testID="home-balance"
            />
          }
        >
          <AppText
            variant="display"
            numeric
            tone={data.balance < 0 ? 'bad' : 'ink'}
            accessibilityLabel={`Solde actuel : ${formatMoney(data.balance)}`}
            testID="home-current-balance"
          >
            {formatMoney(data.balance)}
          </AppText>
          <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
            <Stat
              label={`Reste ${ofMonth(month)}`}
              value={formatMoneySigned(data.totals.rest)}
              caption={`${formatMoneyRounded(data.totals.inc)} − ${formatMoneyRounded(data.totals.exp)}`}
              tone={data.totals.rest < 0 ? 'bad' : 'ink'}
            />
            <Stat
              label="À dépenser par jour"
              value={formatMoney(data.spend.amount)}
              caption={`sur ${data.spend.days} jour${data.spend.days > 1 ? 's' : ''}`}
            />
            <Stat
              label="Fin de mois prévue"
              value={formatMoney(data.endOfMonth)}
              tone={data.endOfMonth < 0 ? 'bad' : 'ink'}
            />
          </Row>
          {data.daily.length > 1 ? (
            <LineChart
              labels={data.daily.map(p => String(p.day))}
              every={Math.ceil(data.daily.length / 6)}
              series={[{ color: c.inc, values: data.daily.map(p => p.balance / 100), area: true }]}
              description={`Solde prévu jour par jour jusqu’à la fin ${ofMonth(month)} : ${formatMoney(data.endOfMonth)} le dernier jour.`}
            />
          ) : null}
        </Card>

        <Card
          title="Prévisions sur 12 mois"
          subtitle={`Plan d’épargne prudent : le compte ne descend jamais sous ${formatMoney(state.settings.buffer)}.`}
        >
          <AppText>
            {data.saveThisMonth > 0
              ? `Tu peux mettre ${formatMoney(data.saveThisMonth)} de côté ce mois-ci.`
              : 'Rien à mettre de côté ce mois-ci sans entamer ta marge de sécurité.'}
          </AppText>
          <LineChart
            labels={data.plan.map(p => monthShort(p.month))}
            every={2}
            series={[
              { color: c.inc, values: data.plan.map(p => p.endBalance / 100) },
              { color: c.save, values: data.plan.map(p => p.savedCumul / 100), area: true },
            ]}
            description={`Fin ${lastPlanMonth ? monthLabel(lastPlanMonth.month) : ''} : solde prévu ${formatMoney(
              lastPlanMonth?.endBalance ?? 0,
            )}, dont ${formatMoney(lastPlanMonth?.savedCumul ?? 0)} d’épargne possible.`}
          />
          <Legend
            items={[
              { color: c.inc, label: 'Solde prévu en fin de mois' },
              { color: c.save, label: 'Épargne possible cumulée' },
            ]}
          />
          <View>
            {data.plan.slice(0, 6).map((p, i) => (
              <View key={p.month}>
                {i > 0 ? <Divider /> : null}
                <Row
                  style={{ paddingVertical: space.sm }}
                  accessible
                  accessibilityLabel={`${monthLabel(p.month)} : fin de mois ${formatMoney(p.endBalance)}, épargne possible ${formatMoney(p.save)}`}
                >
                  <AppText style={{ flex: 1 }}>{monthLabel(p.month)}</AppText>
                  <AppText
                    numeric
                    tone={p.endBalance < 0 ? 'bad' : 'ink2'}
                    style={{ minWidth: 96 }}
                    align="right"
                  >
                    {formatMoneyRounded(p.endBalance)}
                  </AppText>
                  <AppText
                    numeric
                    weight="600"
                    tone={p.save ? 'good' : 'muted'}
                    style={{ minWidth: 96 }}
                    align="right"
                  >
                    {p.save ? `+${formatMoneyRounded(p.save)}` : '—'}
                  </AppText>
                </Row>
              </View>
            ))}
          </View>
        </Card>
      </Grid>

      {data.tips.length > 0 ? (
        <Card
          title="Repères"
          subtitle="Des informations générales, pas un conseil en investissement."
        >
          {data.tips.map(t => (
            <Banner key={t.id} tone={BANNER_TONE[t.tone]} title={t.title}>
              {t.detail}
            </Banner>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
