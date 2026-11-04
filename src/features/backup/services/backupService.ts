import { saveTextFile } from '@/services/files/files';
import type { BudgetState } from '@/types/domain';
import { randomBytes } from '@/utils/random';
import type { Day } from '@/utils/dates';
import {
  BACKUP_EXTENSION,
  decryptBackup,
  encryptBackup,
  parseBackup,
  plainBackup,
  type EncryptedEnvelope,
} from '../domain/crypto';
import { toCsv } from '../domain/exportCsv';
import { importData, type ImportResult } from '../domain/importData';

export type ImportStep =
  { kind: 'encrypted'; envelope: EncryptedEnvelope } | { kind: 'ready'; result: ImportResult };

/** Number of days after which the app reminds the user to back up. */
export const BACKUP_REMINDER_DAYS = 30;

export async function exportEncryptedBackup(
  state: BudgetState,
  passphrase: string,
  today: Day,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const text = await encryptBackup(JSON.stringify(state), passphrase, randomBytes, { onProgress });
  await saveTextFile(`moni-${today}${BACKUP_EXTENSION}`, text, 'application/octet-stream');
}

export function exportJson(state: BudgetState, today: Day): Promise<void> {
  return saveTextFile(`moni-export-${today}.json`, plainBackup(state), 'application/json');
}

export function exportCsv(state: BudgetState, today: Day): Promise<void> {
  return saveTextFile(`moni-operations-${today}.csv`, toCsv(state), 'text/csv');
}

/** First step of an import: parses the file; an encrypted backup needs its passphrase. */
export function readImportFile(text: string, today: Day): ImportStep {
  const parsed = parseBackup(text);
  if (parsed.kind === 'encrypted') return { kind: 'encrypted', envelope: parsed.envelope };
  return { kind: 'ready', result: importData(parsed.data, today) };
}

export async function decryptImport(
  envelope: EncryptedEnvelope,
  passphrase: string,
  today: Day,
  onProgress?: (progress: number) => void,
): Promise<ImportResult> {
  const json = await decryptBackup(envelope, passphrase, { onProgress });
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Le contenu de la sauvegarde est illisible.');
  }
  return importData(data, today);
}
