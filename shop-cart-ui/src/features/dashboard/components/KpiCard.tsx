import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/shared/ui';

interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
  icon: React.ReactNode;
  tone: string;
  to?: string;
  linkLabel?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, note, icon, tone, to, linkLabel }) => (
  <Card className="rounded-2xl p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`} aria-hidden="true">{icon}</span>
    </div>
    <p className="text-2xl font-extrabold tabular text-slate-900">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    {to && (
      <Link to={to} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover hover:underline">
        {linkLabel ?? 'Ver detalle'}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    )}
  </Card>
);
