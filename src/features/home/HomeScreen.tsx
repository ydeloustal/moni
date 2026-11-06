import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  Card,
  Checkbox,
  DayChip,
  Grid,
  Hero,
  HeroTile,
  Icon,
  LineChart,
  Row,
  Screen,
  type IconName,
} from '@/components';
import type { InteractionState } from '@/components/pressable';
import { setPaid } from '@/features/budget/domain/actions';
import {
  baseMonth,
  currentBalance,
  overdue,
  paidSinceCount,
} from '@/features/budget/domain/balance';
import { monthStatus } from '@/features/budget/domain/occurrences';
import { dailyBalance, perDay, projection } from '@/features/budget/domain/projection';
import { BACKUP_REMINDER_DAYS } from '@/features/backup/services/backupService';
import { categoryOf } from '@/features/categories/domain/defaults';
import { insights, type InsightTone } from '@/features/insights/domain/insights';
import { BUNDLED_RATES } from '@/features/savings/domain/bundledRates';
import { isStale } from '@/features/savings/domain/rates';
import { commit, useBudget, useStoreSnapshot } from '@/hooks/useBudget';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import { useToday } from '@/hooks/useToday';
import { radius, space, useColors } from '@/theme';
import {
  daysBetween,
  dayLabel,
  monthName,
  monthShort,
  monthsBetween,
  ofMonth,
} from '@/utils/dates';
import { formatMoney, formatMoneyRounded, formatMoneySigned } from '@/utils/money';

const TIP_STYLE: Record<
  InsightTone,
  {
    icon: IconName;
    bg: 'goodBg' | 'warnBg' | 'badBg' | 'infoBg';
    fg: 'good' | 'warn' | 'bad' | 'info';
  }
> = {
  good: { icon: 'check', bg: 'goodBg', fg: 'good' },
  warn: { icon: 'alert', bg: 'warnBg', fg: 'warn' },
  bad: { icon: 'alert', bg: 'badBg', fg: 'bad' },
  info: { icon: 'info', bg: 'infoBg', fg: 'info' },
};

function Welcome() {
  return (
    <Hero>
      <AppText variant="h1" tone="onHero" accessibilityRole="header">
        Bienvenue dans Moni
      </AppText>
      <AppText tone="heroMuted">
        Tes données restent sur cet appareil. Aucun compte, aucun serveur.
      </AppText>
      <AppText tone="heroMuted" style={{ marginTop: space.sm }}>
        Pour commencer : recopie le solde affiché par l’appli de ta banque, puis ajoute ce qui
        revient chaque mois (salaire, loyer, abonnements…).
      </AppText>
      <Row style={{ flexWrap: 'wrap', marginTop: space.md }}>
        <Button icon="wallet" label="Saisir mon solde" onPress={() => router.push('/balance')} />
        <Button
          icon="repeat"
          label="Ajouter une ligne récurrente"
          onPress={() => router.push({ pathname: '/operation', params: { source: 'rule' } })}
        />
      </Row>
    </Hero>
  );
}

function Tip({
  tone,
  title,
  children,
}: {
  tone: InsightTone;
  title: string;
  children?: React.ReactNode;
}) {
  const c = useColors();
  const t = TIP_STYLE[tone];
  return (
    <View style={styles.tip}>
      <View style={[styles.tipIcon, { backgroundColor: c[t.bg] }]}>
        <Icon name={t.icon} size={20} color={c[t.fg]} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText weight="700">{title}</AppText>
        {typeof children === 'string' ? (
          <AppText variant="caption" tone="ink2">
            {children}
          </AppText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function HomeScreen() {
  const state = useBudget();
  const { recovered } = useStoreSnapshot();
  const today = useToday();
  const c = useColors();
  const { month } = useSelectedMonth();

  const data = useMemo(() => {
    const plan = projection(state, 13);
    const index = Math.max(0, monthsBetween(baseMonth(state), month));
    const row = plan[Math.min(index, plan.length - 1)];
    const pending = monthStatus(state, month)
      .filter(o => !o.done)
      .sort((a, b) => a.date.localeCompare(b.date));
    const toReceive = pending.filter(o => o.sign > 0).reduce((s, o) => s + o.amount, 0);
    const toPay = pending.filter(o => o.sign < 0).reduce((s, o) => s + o.amount, 0);
    return {
      plan,
      index,
      endOfMonth: row?.endBalance ?? currentBalance(state),
      balance: currentBalance(state),
      paidSince: paidSinceCount(state),
      late: overdue(state, today),
      pending,
      allCount: monthStatus(state, month).length,
      toReceive,
      toPay,
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
  const saveRows = data.plan.slice(data.index, data.index + 4);
  const saveMax = Math.max(1, ...saveRows.map(r => r.save));
  const saveNow = data.plan[data.index]?.save ?? 0;
  const pendingTotal = data.pending.reduce((s, o) => s + o.sign * o.amount, 0);
  const lastDay = data.daily[data.daily.length - 1];

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

      {isEmpty ? <Welcome /> : null}

      <Grid max={2}>
        <Hero>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText tone="heroMuted">Solde actuel</AppText>
            <Pressable
              onPress={() => router.push('/balance')}
              accessibilityRole="button"
              accessibilityLabel="Mettre à jour le solde"
              testID="home-balance"
              style={(s: InteractionState) => [
                styles.heroBtn,
                { backgroundColor: c.heroTile, borderColor: s.focused ? c.focus : 'transparent' },
              ]}
            >
              <Icon name="edit" size={18} color={c.onHero} strokeWidth={2} />
              <AppText variant="label" tone="onHero">
                Mettre à jour
              </AppText>
            </Pressable>
          </Row>
          <AppText
            variant="hero"
            tone={data.balance < 0 ? 'heroBad' : 'onHero'}
            numeric
            accessibilityLabel={`Solde actuel : ${formatMoney(data.balance)}`}
            testID="home-current-balance"
          >
            {formatMoney(data.balance)}
          </AppText>
          <Row style={{ gap: 6 }}>
            <Icon name="check" size={16} color={c.heroGood} strokeWidth={2.4} />
            <AppText variant="caption" tone="heroMuted">
              {`Vérifié le ${dayLabel(state.settings.balanceDate)}${
                data.paidSince ? ` · ${data.paidSince} opération(s) passée(s) depuis` : ''
              }`}
            </AppText>
          </Row>
          <View style={styles.tiles}>
            <HeroTile
              label="À dépenser par jour"
              value={formatMoney(data.spend.amount)}
              caption={`${data.spend.days} jour${data.spend.days > 1 ? 's' : ''} restant${data.spend.days > 1 ? 's' : ''}`}
            />
            <HeroTile
              label="Fin de mois prévue"
              value={formatMoney(data.endOfMonth)}
              caption={
                <AppText variant="caption" tone="heroMuted" numeric>
                  <AppText
                    variant="caption"
                    tone="heroGood"
                  >{`+${formatMoneyRounded(data.toReceive)}`}</AppText>
                  {' · '}
                  <AppText
                    variant="caption"
                    tone="heroBad"
                  >{`−${formatMoneyRounded(data.toPay)}`}</AppText>
                </AppText>
              }
            />
          </View>
        </Hero>

        <View style={{ gap: space.lg }}>
          {data.late.length > 0 ? (
            <Banner
              tone="info"
              title={`${data.late.length} opération${data.late.length > 1 ? 's' : ''} devrai${data.late.length > 1 ? 'ent' : 't'} être passée${data.late.length > 1 ? 's' : ''} depuis ton solde du ${dayLabel(state.settings.balanceDate)}`}
              action={
                <Row style={{ flexWrap: 'wrap', marginTop: space.sm }}>
                  <Button small label="Cocher" onPress={() => router.navigate('/operations')} />
                  <Button small label="Mettre à jour" onPress={() => router.push('/balance')} />
                </Row>
              }
            >
              {data.late
                .slice(0, 3)
                .map(o => o.name)
                .join(', ') + (data.late.length > 3 ? '…' : '.')}
            </Banner>
          ) : null}

          {!isEmpty ? (
            <Card
              title={`À venir en ${monthName(month)}`}
              right={
                <AppText tone="muted" numeric>
                  {formatMoneySigned(pendingTotal)}
                </AppText>
              }
            >
              {data.pending.length === 0 ? (
                <AppText tone="muted">Tout est passé pour ce mois-ci.</AppText>
              ) : (
                data.pending.slice(0, 5).map(o => {
                  const category =
                    o.kind === 'exp' ? categoryOf(state.categories, o.categoryId) : null;
                  const late = data.late.some(l => l.key === o.key);
                  return (
                    <View key={o.key} style={[styles.row, { borderTopColor: c.line }]}>
                      <Checkbox
                        checked={o.done}
                        disabled={o.locked}
                        label={`${o.name}, ${formatMoney(o.amount)}, le ${dayLabel(o.date)}`}
                        onChange={v => commit(s => setPaid(s, o.key, v))}
                      />
                      <DayChip day={o.date} tone={late ? 'warn' : 'default'} />
                      <View style={{ flex: 1 }}>
                        <AppText weight="600" numberOfLines={1}>
                          {o.name}
                        </AppText>
                        <AppText variant="caption" tone={late ? 'warn' : 'muted'} numberOfLines={1}>
                          {late
                            ? 'aurait dû passer'
                            : [category?.name ?? 'Revenu', o.source === 'rule' ? 'récurrent' : null]
                                .filter(Boolean)
                                .join(' · ')}
                        </AppText>
                      </View>
                      <AppText numeric weight="700" tone={o.kind === 'inc' ? 'good' : 'ink'}>
                        {o.kind === 'inc' ? '+' : '−'}
                        {formatMoney(o.amount)}
                      </AppText>
                    </View>
                  );
                })
              )}
              <Pressable
                onPress={() => router.navigate('/operations')}
                accessibilityRole="link"
                style={(s: InteractionState) => [
                  styles.more,
                  { borderTopColor: c.line, borderColor: s.focused ? c.focus : 'transparent' },
                ]}
              >
                <AppText weight="700" tone="link" style={{ flex: 1 }}>
                  {`Toutes les opérations ${ofMonth(month)} (${data.allCount})`}
                </AppText>
                <Icon name="chevronRight" size={20} color={c.link} />
              </Pressable>
            </Card>
          ) : null}
        </View>
      </Grid>

      {!isEmpty ? (
        <Grid max={2}>
          <Card
            title={`Épargnable en ${monthName(month)}`}
            right={
              <Button small label="Plan complet" onPress={() => router.navigate('/history')} />
            }
          >
            <View>
              <AppText variant="display" tone="good" numeric>
                {formatMoney(saveNow)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {`sans jamais passer sous ${formatMoneyRounded(state.settings.buffer)} de marge`}
              </AppText>
            </View>
            {saveRows.map(r => (
              <Row
                key={r.month}
                accessible
                accessibilityLabel={`${monthShort(r.month)} : ${formatMoneyRounded(r.save)} épargnables`}
                style={{ gap: space.md }}
              >
                <AppText tone="muted" style={{ width: 44 }}>
                  {monthShort(r.month)}
                </AppText>
                <View style={[styles.bar, { backgroundColor: c.sunken }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: c.save,
                        width: `${Math.round((r.save / saveMax) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <AppText numeric weight="700" align="right" style={{ minWidth: 64 }}>
                  {formatMoneyRounded(r.save)}
                </AppText>
              </Row>
            ))}
          </Card>

          {data.daily.length > 1 ? (
            <Card
              title="Solde jour par jour"
              right={
                <AppText variant="caption" tone="muted">
                  {`jusqu’au ${lastDay ? lastDay.day : ''} ${monthShort(month)}`}
                </AppText>
              }
            >
              <LineChart
                labels={data.daily.map(p => String(p.day))}
                every={Math.ceil(data.daily.length / 5)}
                series={[
                  { color: c.inc, values: data.daily.map(p => p.balance / 100), area: true },
                ]}
                description={`Solde prévu jour par jour jusqu’à la fin ${ofMonth(month)} : ${formatMoney(data.endOfMonth)} le dernier jour.`}
              />
            </Card>
          ) : null}
        </Grid>
      ) : null}

      {!isEmpty && (data.tips.length > 0 || needsBackup) ? (
        <Card
          title="À retenir"
          subtitle="Des informations générales, pas un conseil en investissement."
        >
          {data.tips.map(t => (
            <Tip key={t.id} tone={t.tone} title={t.title}>
              {t.detail}
            </Tip>
          ))}
          {needsBackup ? (
            <Tip
              tone="warn"
              title={
                backupAge === null
                  ? 'Aucune sauvegarde pour l’instant'
                  : `Aucune sauvegarde depuis ${backupAge} jours`
              }
            >
              <AppText variant="caption" tone="ink2">
                Sans serveur, c’est le seul moyen de retrouver tes données si tu perds cet appareil.
              </AppText>
              <Button
                small
                icon="lock"
                label="Sauvegarder"
                onPress={() => router.push('/backup')}
                style={{ alignSelf: 'flex-start', marginTop: space.xs }}
              />
            </Tip>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderWidth: 2,
    borderRadius: 8,
  },
  bar: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  tip: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
