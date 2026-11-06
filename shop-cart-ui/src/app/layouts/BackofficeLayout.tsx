import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Boxes, CreditCard, LayoutDashboard, Layers, LogOut, Menu, Package, ScrollText, Store, TicketPercent, Users, X } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { BrandMark } from '@/shared/ui/BrandMark';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = { ADMINISTRADOR: 'Administrador', OPERADOR: 'Operador' };

export const BackofficeLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const groups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Operación',
      items: [
        { to: '/admin/pedidos', label: 'Pedidos', icon: <Package className="h-[18px] w-[18px]" /> },
        { to: '/admin/inventario', label: 'Inventario y kardex', icon: <Boxes className="h-[18px] w-[18px]" /> },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Administración',
            items: [
              { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
              { to: '/admin/catalogo', label: 'Catálogo', icon: <Layers className="h-[18px] w-[18px]" /> },
              { to: '/admin/cupones', label: 'Cupones', icon: <TicketPercent className="h-[18px] w-[18px]" /> },
              { to: '/admin/pagos', label: 'Pagos', icon: <CreditCard className="h-[18px] w-[18px]" /> },
              { to: '/admin/usuarios', label: 'Usuarios', icon: <Users className="h-[18px] w-[18px]" /> },
              { to: '/admin/bitacora', label: 'Bitácora', icon: <ScrollText className="h-[18px] w-[18px]" /> },
            ],
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-brand-deep to-indigo-900 text-white/75 shadow-xl shadow-black/10 transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navegación del panel"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link to={isAdmin ? '/admin/dashboard' : '/admin/pedidos'} aria-label="Inicio del panel">
            <BrandMark />
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta text-sm font-extrabold text-cta-fg">
              {user?.nombreCompleto.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user?.nombreCompleto}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{ROLE_LABEL[user?.rol ?? ''] ?? user?.rol}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map(g => (
            <div key={g.title}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-widest text-white/65">{g.title}</p>
              <ul className="space-y-1">
                {g.items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                          isActive ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/10 before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-cta' : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={isActive ? 'text-cta' : ''}>{item.icon}</span>
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-4">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
            <Store className="h-[18px] w-[18px] text-cta" /> Ver la tienda
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-950/40 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/10 bg-gradient-to-r from-brand-deep to-indigo-900 px-4 text-white sm:px-6 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-white/85 transition hover:bg-white/10 hover:text-white" aria-label="Abrir menú">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-extrabold">Panel ShopCart</span>
          <Link to="/" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20">Tienda</Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
