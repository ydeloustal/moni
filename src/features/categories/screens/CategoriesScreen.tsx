import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Card, Divider, ListRow, Screen } from '@/components';
import { useBudget } from '@/hooks/useBudget';
import { categoryUsage } from '../domain/actions';

export function CategoriesScreen() {
  const state = useBudget();
  return (
    <Screen>
      <Card
        title="Catégories de dépenses"
        subtitle="« Besoin » ou « envie » sert au repère 50 / 30 / 20."
        right={
          <Button small icon="plus" label="Catégorie" onPress={() => router.push('/category')} />
        }
      >
        {state.categories.map((c, i) => (
          <View key={c.id}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              title={c.name}
              subtitle={`${c.need ? 'Besoin' : 'Envie'} · ${categoryUsage(state, c.id)} ligne(s) ou opération(s)`}
              left={
                <View
                  style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.color }}
                />
              }
              onPress={() => router.push({ pathname: '/category', params: { id: c.id } })}
            />
          </View>
        ))}
      </Card>
      <AppText variant="caption" tone="muted">
        Supprimer une catégorie ne supprime aucune opération : elles sont déplacées dans la
        catégorie de ton choix.
      </AppText>
    </Screen>
  );
}
