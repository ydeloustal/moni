import { View } from 'react-native';
import { AppText, Banner, Card, Divider, Grid, Screen } from '@/components';
import { useToday } from '@/hooks/useToday';
import { space } from '@/theme';
import { dayLongLabel } from '@/utils/dates';
import { formatMoneyRounded, formatPercent } from '@/utils/money';
import { BUNDLED_RATES } from '../domain/bundledRates';
import { isStale, rateAt, REGULATED } from '../domain/rates';

/** Bundled regulated rates: each one with its validity period and its source. Nothing is fetched. */
export function RatesScreen() {
  const today = useToday();
  const file = BUNDLED_RATES;
  return (
    <Screen>
      <Banner
        tone={isStale(file, today) ? 'warn' : 'info'}
        title={`Taux vérifiés le ${dayLongLabel(file.updatedAt)}`}
      >
        {file.nextRevision
          ? `Prochaine révision attendue le ${dayLongLabel(file.nextRevision)}. Les taux sont embarqués dans l’application : une nouvelle version apporte les nouveaux taux. Aucune connexion n’est faite.`
          : 'Les taux sont embarqués dans l’application. Aucune connexion n’est faite.'}
      </Banner>
      <Grid max={2}>
        {[...REGULATED, 'livret-jeune'].map(id => {
          const product = file.products[id];
          if (!product) return null;
          const current = rateAt(file, id, today);
          const history = [...product.rates].reverse().slice(0, 4);
          return (
            <Card
              key={id}
              title={product.label}
              subtitle={[
                product.ceiling
                  ? `Plafond ${formatMoneyRounded(product.ceiling)}`
                  : 'Sans plafond réglementé',
                product.taxFree ? 'exonéré d’impôt' : 'imposable',
              ].join(' · ')}
            >
              {id === 'pel' ? (
                <AppText tone="ink2">Taux fixé à l’ouverture, selon la génération du PEL.</AppText>
              ) : current.rate !== null ? (
                <AppText variant="title" numeric>
                  {formatPercent(current.rate)}
                </AppText>
              ) : id === 'livret-jeune' ? (
                <AppText tone="ink2">
                  Taux libre fixé par la banque, au moins égal à celui du Livret A.
                </AppText>
              ) : (
                <Banner tone="warn" title="Taux à confirmer">
                  La période connue est terminée : ce taux n’est pas présenté comme actuel.
                </Banner>
              )}
              <View style={{ gap: space.sm }}>
                {history.map((r, i) => {
                  const source = file.sources[r.source];
                  return (
                    <View key={r.from} style={{ gap: 2 }}>
                      {i > 0 ? <Divider /> : null}
                      <AppText variant="label">
                        {`${formatPercent(r.rate)} · ${r.to ? `du ${dayLongLabel(r.from)} au ${dayLongLabel(r.to)}` : `depuis le ${dayLongLabel(r.from)}`}`}
                      </AppText>
                      {source ? (
                        <>
                          <AppText variant="caption" tone="ink2">
                            {`${source.title} (${source.evidence === 'officielle' ? 'source officielle' : 'source secondaire'})`}
                          </AppText>
                          <AppText variant="caption" tone="muted" selectable>
                            {source.url}
                          </AppText>
                        </>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </Grid>
      {file.notice ? (
        <AppText variant="caption" tone="muted">
          {file.notice}
        </AppText>
      ) : null}
    </Screen>
  );
}
