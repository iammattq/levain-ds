/**
 * Guarded web storage for the theme code (T32). Blocked storage (privacy modes, sandboxed frames, a full quota)
 * reads as empty and drops writes instead of throwing. Internal: not exported from the package.
 */
export type StorageArea = 'local' | 'session';

function area(which: StorageArea): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = which === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function readKey(which: StorageArea, key: string): string | null {
  try {
    return area(which)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeKey(which: StorageArea, key: string, value: string): void {
  try {
    area(which)?.setItem(key, value);
  } catch {
    // blocked or full: the preference just isn't kept
  }
}

export function removeKey(which: StorageArea, key: string): void {
  try {
    area(which)?.removeItem(key);
  } catch {
    // blocked: nothing to remove
  }
}

/**
 * Move an old key's value to its new key once: if the new key is empty and the old one is set, write `map(old)` to
 * the new key (nothing when map returns null). The old key is removed either way.
 */
export function migrateKey(
  which: StorageArea,
  oldKey: string,
  newKey: string,
  map: (old: string) => string | null = (v) => v
): void {
  const old = readKey(which, oldKey);
  if (old === null) return;
  if (readKey(which, newKey) === null) {
    const mapped = map(old);
    if (mapped !== null) writeKey(which, newKey, mapped);
  }
  removeKey(which, oldKey);
}
