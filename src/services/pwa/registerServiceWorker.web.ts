/**
 * Registers the offline service worker (generated at build time by scripts/build-pwa.mjs).
 * Production only: in development, Metro serves the files and hot reload must not be cached.
 */
export function registerServiceWorker(): void {
  if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  };
  // Routes are loaded lazily: the page may already be fully loaded when this runs.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
