import React from 'react';
import { Link } from 'react-router';
import { Illustration } from '@/shared/ui';

export const ForbiddenPage: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
    <Illustration name="lock" className="w-52" />
    <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-sale">Error 403</p>
    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Sin acceso</h1>
    <p className="mt-2 max-w-md text-sm text-slate-500">
      No tienes permiso para ver esta sección.
    </p>
    <Link to="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-cta px-7 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
      Volver a la tienda
    </Link>
  </div>
);
