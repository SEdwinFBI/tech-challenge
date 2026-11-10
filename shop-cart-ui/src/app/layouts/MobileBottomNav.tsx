import React from 'react';
import { Link, useLocation } from 'react-router';
import { Home, LayoutGrid, ShoppingCart, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/features/auth';

export interface MobileBottomNavProps {
  onOpenCategories: () => void;
  cartCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenCategories, cartCount }) => {
  const user = useAuth(s => s.user);
  const { pathname } = useLocation();
  const accountTo = user ? '/cuenta/pedidos' : '/login';

  const base = 'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors';
  const tone = (active: boolean) => (active ? 'text-brand' : 'text-slate-500');

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <Link to="/" className={`${base} ${tone(pathname === '/')}`}>
        <Home className="h-5 w-5" /> Inicio
      </Link>
      <button type="button" onClick={onOpenCategories} className={`${base} ${tone(false)}`}>
        <LayoutGrid className="h-5 w-5" /> Categorías
      </button>
      <Link to="/carrito" className={`${base} ${tone(pathname.startsWith('/carrito'))}`}>
        <span className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span
              key={cartCount}
              className="absolute -right-2.5 -top-2 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-cta px-1 text-[10px] font-extrabold text-cta-fg"
            >
              {cartCount}
            </span>
          )}
        </span>
        Carrito
      </Link>
      <Link to={accountTo} className={`${base} ${tone(pathname.startsWith('/cuenta') || pathname === '/login')}`}>
        <UserIcon className="h-5 w-5" /> {user ? 'Cuenta' : 'Ingresar'}
      </Link>
    </nav>
  );
};
