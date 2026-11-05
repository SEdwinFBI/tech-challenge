import { useCallback, useMemo, useState } from 'react';
import type { FilterValues } from '../lib/columnFilters';

/** Filtros por columna (texto). Vacío = sin filtro. onChange vuelve a la página 1. */
export function useColumnFilters<K extends string>(keys: readonly K[], onChange?: () => void) {
  const empty = useMemo(() => Object.fromEntries(keys.map(k => [k, ''])) as Record<K, string>, [keys]);
  const [values, setValues] = useState<Record<K, string>>(empty);

  const patch = useCallback(
    (p: FilterValues) => {
      setValues(v => ({ ...v, ...p }));
      onChange?.();
    },
    [onChange],
  );

  const clearAll = useCallback(() => {
    setValues(empty);
    onChange?.();
  }, [empty, onChange]);

  return { values, patch, clearAll, anyActive: Object.values<string>(values).some(Boolean) };
}
