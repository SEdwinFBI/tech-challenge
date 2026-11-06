import React from 'react';
import { formatValue, campoLabel, parseAudit, type ParsedAudit } from '../lib/auditLabels';

interface AuditDiffProps {
  before: string | null;
  after: string | null;
}

const Cell: React.FC<{ field: string; value: unknown; tone: string }> = ({ field, value, tone }) => {
  const f = formatValue(field, value);
  return f.block ? (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-800">{f.text}</pre>
  ) : (
    <span className={tone}>{f.text}</span>
  );
};

const rawText = (p: ParsedAudit) => (p.kind === 'raw' ? p.text : p.kind === 'object' ? JSON.stringify(p.data, null, 2) : '—');

export const AuditDiff: React.FC<AuditDiffProps> = ({ before, after }) => {
  const a = parseAudit(before);
  const b = parseAudit(after);

  if (a.kind === 'raw' || b.kind === 'raw') {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[['Antes', rawText(a)], ['Después', rawText(b)]].map(([title, content]) => (
          <div key={title} className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">{content}</pre>
          </div>
        ))}
      </div>
    );
  }

  const old = a.kind === 'object' ? a.data : {};
  const next = b.kind === 'object' ? b.data : {};
  const keys = Array.from(new Set([...Object.keys(old), ...Object.keys(next)]));

  if (keys.length === 0) return <p className="text-sm text-slate-500">Sin detalle de cambios.</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2 font-bold">Campo</th>
            <th className="px-4 py-2 font-bold">Antes</th>
            <th className="px-4 py-2 font-bold">Después</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {keys.map(k => {
            const changed = JSON.stringify(old[k] ?? null) !== JSON.stringify(next[k] ?? null);
            return (
              <tr key={k} className={changed ? 'bg-amber-50/70' : undefined}>
                <th scope="row" className="px-4 py-2 align-top text-xs font-semibold text-slate-700">{campoLabel(k)}</th>
                <td className="px-4 py-2 align-top text-slate-600">
                  <Cell field={k} value={old[k]} tone={changed ? 'text-rose-700' : ''} />
                </td>
                <td className="px-4 py-2 align-top text-slate-900">
                  <Cell field={k} value={next[k]} tone={changed ? 'font-semibold text-emerald-700' : ''} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
