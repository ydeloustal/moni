import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Card, Divider, ListRow, Toggle } from '@/components';
import { biometricKind, type BiometricKind } from '../services/biometrics';
import { isBiometricsEnabled, setBiometricsEnabled } from '../services/lockService';

export function LockSettings() {
  const [kind, setKind] = useState<BiometricKind | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let alive = true;
    void Promise.all([biometricKind(), isBiometricsEnabled()]).then(([k, e]) => {
      if (!alive) return;
      setKind(k);
      setEnabled(e);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card
      title="Verrouillage"
      subtitle="Moni demande ton code à l’ouverture et après une minute en arrière-plan."
    >
      <ListRow title="Changer le code" onPress={() => router.push('/pin')} />
      {kind ? (
        <>
          <Divider />
          <Toggle
            label="Déverrouiller avec la biométrie"
            hint="Empreinte ou visage enregistrés sur l’appareil. Le code reste toujours possible."
            value={enabled}
            onChange={v => {
              setEnabled(v);
              void setBiometricsEnabled(v);
            }}
          />
        </>
      ) : null}
    </Card>
  );
}
