import React from 'react';
import { Download, RefreshCw, Table2 } from 'lucide-react';
import type { Periodo } from '../api/dashboardApi';
import { PERIODOS } from '../lib/dashboardView';
import { Button } from '@/shared/ui';

function agoLabel(iso: string | number | undefined, now: number): string {
  if (!iso) return 'Actualizado hace un momento';
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'Actualizado hace un momento';
  if (min < 60) return `Actualizado hace ${min} min`;
  const h = Math.floor(min / 60);
  return `Actualizado hace ${h} h`;
}

interface DashboardToolbarProps {
  live: boolean;
  updatedAt: string | number | undefined;
  now: number;
  isFetching: boolean;
  onRefresh: () => void;
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
  tabla: boolean;
  onToggleTabla: () => void;
  exporting: boolean;
  onExport: () => void;
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  live, updatedAt, now, isFetching, onRefresh, periodo, onPeriodo, tabla, onToggleTabla, exporting, onExport,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {live ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
        En vivo
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 py-1 pl-3 pr-1 text-xs font-bold text-slate-600" role="status">
        {agoLabel(updatedAt, now)}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label="Actualizar"
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 hover:bg-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </span>
    )}
    <div role="group" aria-label="Periodo" className="flex rounded-xl bg-slate-200 p-0.5 text-xs font-bold">
      {PERIODOS.map(p => (
        <button
          key={p.id}
          type="button"
          aria-pressed={periodo === p.id}
          onClick={() => onPeriodo(p.id)}
          className={`rounded-lg px-3 py-1.5 transition ${periodo === p.id ? 'bg-white text-brand shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
    <Button variant="outline" size="sm" onClick={onToggleTabla} leftIcon={<Table2 className="mr-1.5 h-4 w-4" />} aria-pressed={tabla}>
      {tabla ? 'Ver gráficas' : 'Ver como tabla'}
    </Button>
    <Button variant="outline" size="sm" onClick={onExport} loading={exporting} leftIcon={<Download className="mr-1.5 h-4 w-4" />}>
      Excel
    </Button>
  </div>
);
