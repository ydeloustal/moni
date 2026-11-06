/**
 * Web QR scanner: webcam (getUserMedia) + jsQR, all in the page. expo-camera's web scanner is
 * not used on purpose: without a native BarcodeDetector it downloads a WASM decoder from a CDN,
 * which this app never does (and its CSP would block).
 */
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { radius, space, useColors } from '@/theme';

type Facing = 'environment' | 'user';

function cameraError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Accès à la caméra refusé. Autorise-le dans les réglages du navigateur (icône à gauche de l’adresse).';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Aucune caméra trouvée. Passe plutôt par un fichier de sauvegarde.';
  }
  return 'Impossible d’ouvrir la caméra. Passe plutôt par un fichier de sauvegarde.';
}

export function QrScanner({ onScan }: { onScan: (data: string) => void }) {
  const c = useColors();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const [started, setStarted] = useState(false);
  const [facing, setFacing] = useState<Facing>('environment');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const supported =
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

  useEffect(() => {
    if (!started || !supported) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && ctx && video.readyState >= 2 && video.videoWidth > 0) {
        // Downscale: jsQR is fast enough at ~720 px and the phone screen fills the frame.
        const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
          inversionAttempts: 'attemptBoth',
        });
        if (found?.data) onScanRef.current(found.data);
      }
      timer = setTimeout(tick, 120);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then(s => {
        if (stopped) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        stream = s;
        setError(null);
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          void video.play().catch(() => undefined);
        }
        tick();
      })
      .catch(e => setError(cameraError(e)));

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [started, facing, supported]);

  const shownError =
    error ??
    (started && !supported
      ? 'La caméra n’est disponible que sur une page sécurisée (https).'
      : null);

  if (!started || shownError) {
    return (
      <View style={[styles.box, styles.center, { backgroundColor: c.sunken }]}>
        <AppText align="center" tone={shownError ? 'bad' : 'ink2'}>
          {shownError ??
            'Moni utilise la webcam uniquement pour lire les QR codes, dans cette page. Aucune image n’est enregistrée ni envoyée.'}
        </AppText>
        <Button
          kind="primary"
          icon="target"
          label={shownError ? 'Réessayer' : 'Activer la caméra'}
          onPress={() => {
            setError(null);
            setStarted(true);
          }}
          testID="camera-start"
        />
      </View>
    );
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.box, { backgroundColor: '#000' }]}>
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Caméra : vise le QR code affiché sur l’autre appareil"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facing === 'user' ? 'scaleX(-1)' : undefined,
          }}
        />
      </View>
      <Button
        small
        icon="repeat"
        label="Changer de caméra"
        onPress={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))}
        style={{ alignSelf: 'center' }}
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
