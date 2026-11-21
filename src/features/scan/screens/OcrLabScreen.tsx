/**
 * Phase 0 spike (dev builds only): runs the on-device OCR on a chosen image and shows the raw lines,
 * the timing and the total/date guesses, to measure quality on real receipts before building the feature.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { AppText, Button, Card, Divider, Screen, Stack } from '@/components';
import { dayLongLabel } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { isOcrAvailable, recognize, type OcrResult } from '../../../../modules/moni-ocr';
import { guessDate, guessTotal } from '../domain/receipt';

interface Run {
  name: string;
  result: OcrResult;
  totalMs: number;
}

export function OcrLabScreen() {
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;
    setBusy(true);
    const started = Date.now();
    try {
      const result = await recognize(asset.uri);
      setRun({ name: asset.name, result, totalMs: Date.now() - started });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      // The receipt copy must not stay on the device.
      const file = new File(asset.uri);
      if (file.exists) file.delete();
    }
  }

  const total = run ? guessTotal(run.result.lines) : null;
  const date = run ? guessDate(run.result.lines) : null;

  return (
    <Screen>
      <Stack>
        <Card
          title="Labo OCR (phase 0)"
          subtitle="Reconnaissance sur l’appareil, aucune connexion. L’image est supprimée après lecture."
        >
          {isOcrAvailable ? (
            <Button
              kind="primary"
              label={busy ? 'Lecture…' : 'Choisir une image'}
              onPress={() => void pick()}
              disabled={busy}
            />
          ) : (
            <AppText tone="ink2">
              Module OCR absent : il faut un development build Android ou iOS.
            </AppText>
          )}
          {error ? <AppText tone="ink2">Erreur : {error}</AppText> : null}
        </Card>

        {run ? (
          <Card title={run.name}>
            <AppText>
              Moteur : {Math.round(run.result.engineMs)} ms · total : {run.totalMs} ms ·{' '}
              {run.result.width}×{run.result.height} px · {run.result.lines.length} lignes
            </AppText>
            <AppText>
              Total : {total ? `${formatMoney(total.value)} (${total.confidence})` : 'non trouvé'}
            </AppText>
            <AppText>Date : {date ? dayLongLabel(date.value) : 'non trouvée'}</AppText>
            <Divider />
            {run.result.lines.map((line, i) => (
              <AppText
                key={i}
                tone={i === total?.line || i === date?.line ? 'ink' : 'muted'}
                selectable
              >
                {line.text} · {Math.round(line.confidence * 100)} %
              </AppText>
            ))}
          </Card>
        ) : null}
      </Stack>
    </Screen>
  );
}
