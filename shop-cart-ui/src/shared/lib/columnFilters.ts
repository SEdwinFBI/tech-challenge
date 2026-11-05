/** Definición de filtros para la cabecera de columna. */
export type FilterDef =
  | { type: 'texto'; key: string; label: string; placeholder?: string }
  | { type: 'opciones'; key: string; label: string; options: Array<{ value: string; label: string }>; allLabel?: string }
  | { type: 'fechas'; keyDesde: string; keyHasta: string; label: string }
  | { type: 'rango'; keyMin: string; keyMax: string; label: string; prefix?: string };

export type FilterValues = Record<string, string>;

export const filterKeys = (def: FilterDef): string[] => {
  switch (def.type) {
    case 'fechas':
      return [def.keyDesde, def.keyHasta];
    case 'rango':
      return [def.keyMin, def.keyMax];
    default:
      return [def.key];
  }
};

export const isFilterActive = (def: FilterDef, values: FilterValues): boolean => filterKeys(def).some(k => Boolean(values[k]));

const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

/** Texto del chip del filtro, o null si no hay filtro activo. */
export const filterSummary = (def: FilterDef, values: FilterValues): string | null => {
  if (!isFilterActive(def, values)) return null;
  switch (def.type) {
    case 'texto':
      return `${def.label}: ${values[def.key]}`;
    case 'opciones':
      return `${def.label}: ${def.options.find(o => o.value === values[def.key])?.label ?? values[def.key]}`;
    case 'fechas': {
      const d = values[def.keyDesde];
      const h = values[def.keyHasta];
      if (d && h) return `${def.label}: ${shortDate(d)} – ${shortDate(h)}`;
      return d ? `${def.label}: desde ${shortDate(d)}` : `${def.label}: hasta ${shortDate(h)}`;
    }
    case 'rango': {
      const p = def.prefix ?? '';
      const a = values[def.keyMin];
      const b = values[def.keyMax];
      if (a && b) return `${def.label}: ${p}${a} – ${p}${b}`;
      return a ? `${def.label}: desde ${p}${a}` : `${def.label}: hasta ${p}${b}`;
    }
  }
};

/** Pasa fechas yyyy-mm-dd a ISO, día completo en hora local. */
export const dateRangeToIso = (desde: string, hasta: string): { fechaDesde?: string; fechaHasta?: string } => ({
  fechaDesde: desde ? new Date(`${desde}T00:00:00`).toISOString() : undefined,
  fechaHasta: hasta ? new Date(`${hasta}T23:59:59.999`).toISOString() : undefined,
});

export const numberOrUndefined = (v: string): number | undefined => (v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);
