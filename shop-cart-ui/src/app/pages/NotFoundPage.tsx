import React from 'react';
import { Link } from 'react-router';
import { Illustration } from '@/shared/ui';

export const NotFoundPage: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
    <Illustration name="compass" className="w-52" />
    <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-brand">Error 404</p>
    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Página no encontrada</h1>
    <p className="mt-2 max-w-md text-sm text-slate-500">Esta dirección no existe.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link to="/" className="inline-flex h-12 items-center rounded-full bg-cta px-7 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">Ir al inicio</Link>
      <Link to="/catalogo" className="inline-flex h-12 items-center rounded-full border border-slate-300 px-7 text-sm font-bold text-slate-700 hover:bg-slate-50">Catálogo</Link>
    </div>
  </div>
);
