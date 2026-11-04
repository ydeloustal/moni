/**
 * Platform entry point. Metro picks `repository.native.ts` on iOS/Android and `repository.web.ts` on the web;
 * this file only exists for TypeScript resolution.
 */
export { createRepository } from './repository.native';
