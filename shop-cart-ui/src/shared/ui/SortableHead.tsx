import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SortState } from '../hooks/useSort';
import { TableHead } from './Table';
import { ColumnFilter, type ColumnFilterProps } from './ColumnFilter';

export interface SortableHeadProps<K extends string> extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'onClick'> {
  column: K;
  sort: SortState<string>;
  onSort: (column: K) => void;
  children: React.ReactNode;
  /** Filtro de la columna; muestra el embudo junto al título. */
  filter?: ColumnFilterProps;
}

/** Cabecera que ordena en servidor y opcionalmente filtra. Estado en aria-sort del th. */
export function SortableHead<K extends string>({ column, sort, onSort, children, filter, className = '', ...props }: SortableHeadProps<K>) {
  const active = sort.orden === column;
  const ariaSort = active ? (sort.direccion === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = !active ? ArrowUpDown : sort.direccion === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead aria-sort={ariaSort} className={className} {...props}>
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSort(column)}
          className="inline-flex items-center gap-1.5 rounded uppercase tracking-wider hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          {children}
          <Icon className={`h-3.5 w-3.5 ${active ? 'text-slate-800' : 'text-slate-400'}`} aria-hidden="true" />
        </button>
        {filter && <ColumnFilter {...filter} />}
      </span>
    </TableHead>
  );
}
