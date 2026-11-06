/** Native QR scanner (iOS / Android): the system decodes on the device, nothing is sent anywhere. */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { radius, space, useColors } from '@/theme';

export function QrScanner({ onScan }: { onScan: (data: string) => void }) {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    const blocked = permission ? !permission.canAskAgain : false;
    return (
      <View style={[styles.box, styles.center, { backgroundColor: c.sunken }]}>
        <AppText align="center" tone="ink2">
          {blocked
            ? 'L’accès à la caméra est refusé. Autorise-le dans les réglages du téléphone pour scanner.'
            : 'Moni utilise la caméra uniquement pour lire les QR codes. Aucune photo n’est enregistrée.'}
        </AppText>
        <Button
          kind="primary"
          icon="target"
          label={blocked ? 'Ouvrir les réglages' : 'Activer la caméra'}
          onPress={() => (blocked ? void Linking.openSettings() : void requestPermission())}
          testID="camera-start"
        />
      </View>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: '#000' }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={e => onScan(e.data)}
        accessibilityLabel="Caméra : vise le QR code affiché sur l’autre appareil"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
});
