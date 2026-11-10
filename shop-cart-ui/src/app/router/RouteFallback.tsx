import React from 'react';
import { BrandLoader } from '@/shared/ui/BrandLoader';

export const RouteFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <BrandLoader size={200} label="Cargando…" />
  </div>
);
