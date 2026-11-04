/**
 * CSV cell (";" separator, opens directly in French spreadsheets).
 * Cells starting with = + - @ tab or CR are neutralised to prevent formula injection.
 */
export function csvCell(value: unknown): string {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsvText(rows: unknown[][]): string {
  // BOM so that spreadsheets detect UTF-8.
  return '﻿' + rows.map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
