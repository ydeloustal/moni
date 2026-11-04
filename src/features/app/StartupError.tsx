import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Banner, Button, ErrorState } from '@/components';
import { RestoreFlow } from '@/features/backup/components/RestoreFlow';
import { useStoreSnapshot } from '@/hooks/useBudget';
import { space, useColors } from '@/theme';

/**
 * Shown when the stored data cannot be opened. Nothing is erased: the user can restore a backup,
 * or update the app when the data comes from a newer version.
 */
export function StartupError() {
  const c = useColors();
  const { status, error } = useStoreSnapshot();
  const [restoring, setRestoring] = useState(false);

  if (status === 'newer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg, padding: space.xl }}>
        <ErrorState title="Mise à jour nécessaire" message={error ?? ''} />
        <AppText tone="muted" align="center">
          Tes données restent intactes sur cet appareil.
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: c.bg,
        padding: space.xl,
        gap: space.lg,
      }}
    >
      <ErrorState
        title="Données illisibles"
        message={error ?? 'Les données de cet appareil sont illisibles.'}
      />
      <Banner tone="info" title="Rien n'a été effacé">
        Tu peux restaurer une sauvegarde Moni (.moni) ou un export JSON. Les données actuelles ne
        seront remplacées qu&apos;après ta confirmation.
      </Banner>
      {restoring ? (
        <RestoreFlow onDone={() => setRestoring(false)} />
      ) : (
        <Button
          kind="primary"
          icon="upload"
          label="Restaurer une sauvegarde"
          onPress={() => setRestoring(true)}
        />
      )}
    </View>
  );
}
