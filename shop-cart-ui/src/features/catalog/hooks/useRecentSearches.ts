import { useCallback, useState } from 'react';

const KEY = 'shopcart.busquedas-recientes';
const MAX = 6;

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* almacenamiento no disponible: el historial es opcional */
  }
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(read);

  const add = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setItems(prev => {
      const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((term: string) => {
    setItems(prev => {
      const next = prev.filter(x => x !== term);
      write(next);
      return next;
    });
  }, []);

  return { items, add, remove };
}
