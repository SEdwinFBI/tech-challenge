import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/shared/ui';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, action, children }) => (
  <Card className="rounded-2xl p-5 sm:p-6 !overflow-visible" role="region" aria-label={title}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><BarChart3 className="h-4 w-4 text-brand" aria-hidden="true" />{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </Card>
);
