import React from 'react';
import { Link, Outlet } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { BrandMark } from '@/shared/ui/BrandMark';

export const CheckoutLayout: React.FC = () => (
  <div className="min-h-screen bg-white text-slate-800">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Inicio">
          <BrandMark light={false} />
        </Link>
        <p className="hidden items-center gap-1.5 text-xs font-semibold text-emerald-700 sm:flex">
          <Lock className="h-3.5 w-3.5" /> Pago seguro
        </p>
        <Link to="/carrito" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> Volver al carrito
        </Link>
      </div>
    </header>
    <Outlet />
  </div>
);
