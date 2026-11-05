import { useCallback, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  orden: K;
  direccion: SortDirection;
}

/** Orden de tabla. Misma columna invierte la dirección; otra empieza en asc. */
export function useSort<K extends string>(initial: SortState<K>, onChange?: () => void) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const toggle = useCallback(
    (col: K) => {
      setSort(s => (s.orden === col ? { orden: col, direccion: s.direccion === 'asc' ? 'desc' : 'asc' } : { orden: col, direccion: 'asc' }));
      onChange?.();
    },
    [onChange],
  );

  return { sort, toggle };
}
