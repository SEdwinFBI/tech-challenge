import React from 'react';

interface DataTableProps {
  caption: string;
  headers: string[];
  rows: Array<{ key: string; cells: React.ReactNode[] }>;
}

export const DataTable: React.FC<DataTableProps> = ({ caption, headers, rows }) => (
  <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
    <table className="w-full text-left text-sm tabular">
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
        <tr>
          {headers.map((h, i) => <th key={h} scope="col" className={`px-4 py-2 ${i === 0 ? '' : 'text-right'}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(r => (
          <tr key={r.key}>
            {r.cells.map((c, i) => <td key={i} className={`px-4 py-2 ${i === 0 ? '' : 'text-right'}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
