import { router } from 'expo-router';
import { ErrorState, Screen } from '@/components';

export default function NotFound() {
  return (
    <Screen>
      <ErrorState
        title="Page introuvable"
        message="Cette page n’existe pas."
        action={{ label: 'Retour à l’accueil', onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
