import React from 'react';
import { Link } from 'react-router';
import { PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { BrandLogo } from '@/shared/ui/BrandMark';

export interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const BENEFITS = [
  { icon: Truck, text: 'Envío a toda Guatemala' },
  { icon: ShieldCheck, text: 'Pago seguro con tarjeta' },
  { icon: PackageCheck, text: 'Devoluciones fáciles' },
];

export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand via-brand-hover to-brand-deep px-12 py-10 text-white lg:flex lg:flex-col">
      <span className="pointer-events-none absolute -right-28 -top-28 h-[26rem] w-[26rem] rounded-full bg-white/[0.07]" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-10 -top-10 h-[16rem] w-[16rem] rounded-full border border-white/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-36 -left-24 h-[26rem] w-[26rem] rounded-full bg-cta/15" aria-hidden="true" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <Link to="/" className="group flex flex-col items-center rounded-3xl focus-visible:outline-white" aria-label="Inicio">
          <span className="flex h-52 w-52 items-center justify-center rounded-full bg-white shadow-2xl shadow-black/20 ring-8 ring-white/10 transition group-hover:scale-[1.02]">
            <BrandLogo variant="mascot" width={150} />
          </span>
          <span className="mt-7 text-5xl font-extrabold leading-none tracking-tight">ShopCart</span>
          <span className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-cta">Don Arturo</span>
        </Link>

        <h2 className="mt-9 max-w-xs text-balance text-2xl font-extrabold leading-snug tracking-tight">
          Lo que necesitas, hasta la puerta de tu casa
        </h2>

        <ul className="mt-8 space-y-3.5 text-left">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15">
                <Icon className="h-4 w-4 text-cta" aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-center text-xs text-white/70">© 2026 ShopCart · Don Arturo · Grupo Pentandra</p>
    </aside>

    <main className="flex items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[400px] animate-fade-up">
        <Link to="/" className="mb-8 flex w-fit items-center gap-2.5 lg:hidden" aria-label="Inicio">
          <BrandLogo variant="mascot" width={48} />
          <span className="text-2xl font-extrabold tracking-tight text-brand-deep">ShopCart</span>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        <div className="mt-8 text-center text-sm text-slate-600">{footer}</div>
      </div>
    </main>
  </div>
);

export const authInput =
  'h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/25';
