// Borradores en sessionStorage para no perder formularios si caduca la sesión
const PREFIX = 'shopcart_draft:';
const OWNER_KEY = 'shopcart_draft_owner';

export function readDraft<T>(name: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + name);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function hasDraft(name: string): boolean {
  return readDraft(name) !== null;
}

export function saveDraft(name: string, value: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    /* storage no disponible */
  }
}

export function clearDraft(name: string): void {
  try {
    sessionStorage.removeItem(PREFIX + name);
  } catch {
    /* storage no disponible */
  }
}

export function clearAllDrafts(): void {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
    sessionStorage.removeItem(OWNER_KEY);
  } catch {
    /* storage no disponible */
  }
}

/** Los borradores son del usuario que los escribió; otro usuario los descarta. */
export function claimDrafts(userId: number): void {
  try {
    const owner = sessionStorage.getItem(OWNER_KEY);
    if (owner !== null && owner !== String(userId)) clearAllDrafts();
    sessionStorage.setItem(OWNER_KEY, String(userId));
  } catch {
    /* storage no disponible */
  }
}
