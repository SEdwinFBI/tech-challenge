export const SERIES = '#0e7c66';
export const GRID = '#e7e5e4';
export const AXIS = '#78716c';
export const LABEL = '#44403c';

export const TOOLTIP_STYLE = { borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 } as const;

export const compactQ = (n: number) => (n >= 1000 ? `Q${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `Q${Math.round(n)}`);

export interface StateMeta {
  code: string;
  label: string;
  color: string;
}

export const ORDER_STATES: StateMeta[] = [
  { code: 'PAGADO', label: 'Pagado', color: '#2563eb' },
  { code: 'EN_PREPARACION', label: 'En preparación', color: '#7c3aed' },
  { code: 'DESPACHADO', label: 'Despachado', color: '#d97706' },
  { code: 'ENTREGADO', label: 'Entregado', color: '#0e7c66' },
  { code: 'CANCELADO', label: 'Cancelado', color: '#d7263d' },
  { code: 'DEVUELTO_PARCIAL', label: 'Devuelto parcial', color: '#0891b2' },
  { code: 'DEVUELTO_TOTAL', label: 'Devuelto total', color: '#57534e' },
];

export const PAYMENT_STATES: StateMeta[] = [
  { code: 'AUTORIZADO', label: 'Autorizado', color: '#2563eb' },
  { code: 'CAPTURADO', label: 'Cobrado', color: '#0e7c66' },
  { code: 'RECHAZADO', label: 'Rechazado', color: '#d7263d' },
  { code: 'ANULADO', label: 'Anulado', color: '#57534e' },
  { code: 'PENDIENTE_CONCILIACION', label: 'Pendiente de conciliación', color: '#d97706' },
];

const FALLBACK_COLOR = '#a8a29e';

export function resolveStates<T extends { Estado: string }>(
  known: StateMeta[],
  rows: T[],
  count: (row: T) => number,
  amount: (row: T) => number,
): Array<StateMeta & { count: number; amount: number }> {
  const byCode = new Map(rows.map(r => [r.Estado, r]));
  const base = known.map(m => {
    const row = byCode.get(m.code);
    return { ...m, count: row ? count(row) : 0, amount: row ? amount(row) : 0 };
  });
  const extra = rows
    .filter(r => !known.some(m => m.code === r.Estado))
    .map(r => ({ code: r.Estado, label: r.Estado, color: FALLBACK_COLOR, count: count(r), amount: amount(r) }));
  return [...base, ...extra];
}
