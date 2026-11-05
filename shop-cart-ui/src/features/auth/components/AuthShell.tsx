import React from 'react';
import { Link } from 'react-router';
import { BrandMark } from '@/shared/ui/BrandMark';

export interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand via-brand-hover to-brand-deep p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <span className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cta/20" aria-hidden="true" />
      <Link to="/" className="relative" aria-label="Inicio">
        <BrandMark />
      </Link>
      <p className="relative text-xs text-white/60">© 2026 ShopCart · Don Arturo · Grupo Pentandra</p>
    </aside>

    <main className="flex items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="mb-8 inline-block lg:hidden" aria-label="Inicio">
          <BrandMark light={false} />
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        <div className="mt-8 text-center text-sm text-slate-600">{footer}</div>
      </div>
    </main>
  </div>
);

export const authInput =
  'h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20';
