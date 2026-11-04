import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Card, Divider, EmptyState, ListRow, Row, Screen, Stat } from '@/components';
import { frequencyLabel } from '@/features/budget/forms/operationForm';
import { useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { space } from '@/theme';
import { monthOf } from '@/utils/dates';
import { formatMoney, formatMoneyRounded } from '@/utils/money';
import { activeSubscriptions, subscriptionCost } from '../domain/subscriptions';

export function SubscriptionsScreen() {
  const state = useBudget();
  const month = monthOf(useToday());
  const list = activeSubscriptions(state, month);
  const cost = subscriptionCost(state, month);
  return (
    <Screen>
      {list.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="Aucun abonnement"
          action={{
            label: 'Ajouter',
            onPress: () => router.push({ pathname: '/operation', params: { source: 'rule' } }),
          }}
        >
          Marque une ligne récurrente comme « abonnement » pour suivre son coût ici.
        </EmptyState>
      ) : (
        <>
          <Row style={{ flexWrap: 'wrap', gap: space.md, alignItems: 'stretch' }}>
            <Stat label="Par mois (lissé)" value={formatMoney(cost.monthly)} large />
            <Stat label="Par an" value={formatMoneyRounded(cost.yearly)} large />
            <Stat label="Abonnements" value={String(cost.count)} large />
          </Row>
          <Card
            title="Abonnements en cours"
            subtitle="Un abonnement trimestriel ou annuel est ramené à son coût par mois."
          >
            {list.map((s, i) => (
              <View key={s.rule.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={s.rule.name}
                  subtitle={`${formatMoney(s.rule.amount)} · ${frequencyLabel(s.rule.every).toLowerCase()} · ${formatMoneyRounded(s.yearly)} par an`}
                  right={
                    <AppText numeric weight="600">
                      {formatMoney(s.monthly)}/mois
                    </AppText>
                  }
                  onPress={() =>
                    router.push({
                      pathname: '/operation',
                      params: { id: s.rule.id, source: 'rule' },
                    })
                  }
                />
              </View>
            ))}
          </Card>
          <AppText variant="caption" tone="muted">
            Astuce : désactive « Comptée dans le budget » sur une ligne pour voir l’effet d’une
            résiliation sans la supprimer.
          </AppText>
        </>
      )}
    </Screen>
  );
}
