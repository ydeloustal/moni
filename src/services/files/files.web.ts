/** Files in the browser: direct download, import through the file picker. Nothing is sent anywhere. */
import * as DocumentPicker from 'expo-document-picker';
import { FileTooLargeError, MAX_IMPORT_BYTES } from './types';

export async function saveTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['.moni', '.json', 'application/json', 'text/plain'],
    multiple: false,
    base64: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.file) return null;
  if (asset.file.size > MAX_IMPORT_BYTES) throw new FileTooLargeError();
  return asset.file.text();
}

export function cleanupExports(): void {
  // Nothing is written outside the browser's download flow.
}
