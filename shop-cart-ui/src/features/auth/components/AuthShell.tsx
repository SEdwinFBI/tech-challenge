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
  <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
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

      <p className="relative text-center text-xs text-white/70">© 2026 ShopCart por Santos Edwin Baquiax</p>
    </aside>

    <div className="flex min-h-screen flex-col lg:min-h-0">
      <div className="lg:hidden">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-hover to-brand-deep px-6 pb-6 pt-10 text-white">
        <span className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/[0.08]" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-cta/15" aria-hidden="true" />
        <div className="relative flex flex-col items-center text-center">
          <Link to="/" className="flex flex-col items-center" aria-label="Inicio">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-white/20">
              <BrandLogo variant="mascot" width={60} />
            </span>
            <span className="mt-3 text-3xl font-extrabold tracking-tight text-white">ShopCart</span>
            <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.25em] text-cta">Don Arturo</span>
          </Link>
          <p className="mt-3 text-xs font-semibold text-white/90">Lo que necesitas, hasta la puerta de tu casa</p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-white/80">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5">Envío a toda Guatemala</span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5">Pago seguro</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden leading-none text-white -mt-px">
        <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" className="block h-10 w-full sm:h-12">
          <path
            d="M0,40 C360,110 720,-30 1080,40 C1260,75 1380,55 1440,40 L1440,120 L0,120 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
      </div>

      <main className="flex-1 bg-white px-5 pb-12 pt-2 sm:px-10 lg:flex lg:items-center lg:justify-center lg:py-10">
        <div className="mx-auto w-full max-w-[400px] animate-fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-600 lg:mt-2">{subtitle}</p>}
          <div className="mt-6 lg:mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-600 lg:mt-8">{footer}</div>
        </div>
      </main>
    </div>
  </div>
);

export const authInput =
  'h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/25';
