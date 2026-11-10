import React from 'react';
import { Skeleton } from '@/shared/ui';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <Skeleton className="h-8 w-56" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
    <Skeleton className="h-80 w-full rounded-2xl" />
  </div>
);
