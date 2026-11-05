/**
 * Web: browsers have no secure enclave reachable from a page. The PIN hash is kept in localStorage, private to
 * the site's origin. The lock protects against casual access to an open browser, not against someone who can read
 * the browser profile (documented in the privacy page).
 */
const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const secureStorage = {
  get: async (key: string): Promise<string | null> =>
    storage()?.getItem(key) ?? memory.get(key) ?? null,
  set: async (key: string, value: string): Promise<void> => {
    const s = storage();
    if (s) s.setItem(key, value);
    else memory.set(key, value);
  },
  remove: async (key: string): Promise<void> => {
    storage()?.removeItem(key);
    memory.delete(key);
  },
  isHardwareBacked: false,
};
