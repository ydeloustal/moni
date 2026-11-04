import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Banner, Card, Button } from '@/components';
import type { SavingsAccount } from '@/types/domain';
import { space } from '@/theme';
import { dayLongLabel, type Day } from '@/utils/dates';
import { formatMoney, formatMoneyRounded, formatPercent } from '@/utils/money';
import { BUNDLED_RATES } from '../domain/bundledRates';
import {
  accountRateAt,
  ceilingInfo,
  customRateNeedsCheck,
  estimateInterest,
  PRODUCT_LABELS,
  savingsBalance,
} from '../domain/interest';

export function rateDescription(account: SavingsAccount, today: Day): string {
  const r = accountRateAt(BUNDLED_RATES, account, today);
  if (r.rate === null) {
    if (r.status === 'expired' && r.last) {
      return `Taux à confirmer : le dernier taux connu (${formatPercent(r.last.rate)}) valait jusqu’au ${dayLongLabel(r.last.to ?? today)}.`;
    }
    return r.origin === 'none' ? 'Taux non renseigné.' : 'Taux inconnu pour cette date.';
  }
  if (r.origin === 'custom') return `${formatPercent(r.rate)} (taux saisi)`;
  const period = r.entry
    ? r.entry.to
      ? `du ${dayLongLabel(r.entry.from)} au ${dayLongLabel(r.entry.to)}`
      : `depuis le ${dayLongLabel(r.entry.from)}`
    : '';
  const evidence = r.source?.evidence === 'officielle' ? 'source officielle' : 'source secondaire';
  return `${formatPercent(r.rate)} ${account.product === 'pel' ? '(génération du PEL) ' : ''}· ${period} · ${evidence}`;
}

export function AccountCard({ account, today }: { account: SavingsAccount; today: Day }) {
  const year = Number(today.slice(0, 4));
  const balance = savingsBalance(account, today);
  const rate = accountRateAt(BUNDLED_RATES, account, today);
  const estimate = estimateInterest(BUNDLED_RATES, account, year);
  const ceiling = ceilingInfo(BUNDLED_RATES, account, today);
  const title = account.name || PRODUCT_LABELS[account.product];
  return (
    <Card
      title={title}
      subtitle={
        [account.name ? PRODUCT_LABELS[account.product] : null, account.bank]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      right={
        <Button
          small
          label="Modifier"
          accessibilityLabel={`Modifier ${title}`}
          onPress={() => router.push({ pathname: '/account', params: { id: account.id } })}
        />
      }
    >
      <AppText
        variant="title"
        numeric
        accessibilityLabel={`Solde estimé : ${formatMoney(balance)}`}
      >
        {formatMoney(balance)}
      </AppText>
      <AppText variant="caption" tone="muted">
        {rateDescription(account, today)}
      </AppText>
      <View style={{ gap: space.sm }}>
        <AppText tone="ink2">
          {`≈ ${formatMoney(estimate.interest)} d’intérêts estimés en ${year} (crédités au 31 décembre), soit ${formatMoneyRounded(
            estimate.endBalance,
          )} en fin d’année.`}
        </AppText>
        {estimate.missingFortnights > 0 ? (
          <Banner tone="warn" title={`${estimate.missingFortnights} quinzaine(s) sans taux connu`}>
            Elles ne sont pas comptées : Moni n’invente jamais un taux.
          </Banner>
        ) : null}
        {estimate.assumedConstantBefore ? (
          <AppText variant="caption" tone="muted">
            {`Avant le ${dayLongLabel(account.balanceDate)}, le solde est supposé identique (historique inconnu).`}
          </AppText>
        ) : null}
        {rate.belowFloor ? (
          <Banner tone="bad" title="Taux sous le plancher légal">
            Le taux d’un livret jeune ne peut pas être inférieur à celui du Livret A : vérifie le
            taux saisi.
          </Banner>
        ) : null}
        {customRateNeedsCheck(account, today) ? (
          <Banner tone="info" title="Taux à revérifier">
            Les banques changent leurs taux librement : vérifie-le et mets-le à jour (rappel tous
            les 6 mois).
          </Banner>
        ) : null}
        {ceiling ? (
          ceiling.over ? (
            <Banner tone="warn" title="Plafond dépassé">
              {`Le plafond des versements est de ${formatMoneyRounded(ceiling.ceiling)} (les intérêts peuvent le dépasser).`}
            </Banner>
          ) : (
            <AppText variant="caption" tone="muted">
              {`Plafond ${formatMoneyRounded(ceiling.ceiling)} : encore ${formatMoneyRounded(ceiling.room)} de versements possibles.`}
            </AppText>
          )
        ) : null}
      </View>
    </Card>
  );
}
