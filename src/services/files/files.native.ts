/**
 * Files on iOS / Android: export through the system share sheet (the user chooses where to save),
 * import through the document picker. Temporary export copies are deleted at the next start.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FileTooLargeError, MAX_IMPORT_BYTES } from './types';

const exportDirectory = (): Directory => {
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

const UTI: Record<string, string> = {
  'text/csv': 'public.comma-separated-values-text',
  'application/json': 'public.json',
};

export async function saveTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(exportDirectory(), name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: 'Enregistrer le fichier Moni',
    UTI: UTI[mimeType] ?? 'public.data',
  });
}

/** Returns the text of the chosen file, or null if the user cancelled. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'application/octet-stream', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size ?? 0) > MAX_IMPORT_BYTES) throw new FileTooLargeError();
    return await file.text();
  } finally {
    // Temporary copy in the cache: it may contain unencrypted data, do not keep it.
    if (file.exists) file.delete();
  }
}

/** Deletes exports left in the cache (they may contain unencrypted data). */
export function cleanupExports(): void {
  try {
    const dir = new Directory(Paths.cache, 'exports');
    if (dir.exists) dir.delete();
  } catch {
    // Nothing serious: the OS clears the cache eventually.
  }
}
