/** Imports are limited to 20 MB (a trapped file must not exhaust memory). */
export const MAX_IMPORT_BYTES = 20_000_000;

export class FileTooLargeError extends Error {
  constructor() {
    super('Fichier trop volumineux (20 Mo maximum).');
    this.name = 'FileTooLargeError';
  }
}
