import { useCallback, useSyncExternalStore } from 'react';

/** Sin precio a propósito: uno viejo confundiría al cliente. */
export interface RecentProduct {
  id: number;
  nombre: string;
  imagen?: string | null;
  categoria?: string;
}

const KEY = 'shopcart_recently_viewed';
const MAX = 12;
const listeners = new Set<() => void>();
let cache: RecentProduct[] | null = null;

function read(): RecentProduct[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(parsed) ? (parsed as RecentProduct[]).filter(p => typeof p?.id === 'number') : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: RecentProduct[]): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin storage: solo en memoria */
  }
  listeners.forEach(l => l());
}

export function trackRecentlyViewed(product: RecentProduct): void {
  const current = read();
  if (current[0]?.id === product.id) return;
  write([product, ...current.filter(p => p.id !== product.id)].slice(0, MAX));
}

export function useRecentlyViewed(excludeId?: number): RecentProduct[] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const snapshot = useSyncExternalStore(subscribe, read, read);
  return excludeId ? snapshot.filter(p => p.id !== excludeId) : snapshot;
}
