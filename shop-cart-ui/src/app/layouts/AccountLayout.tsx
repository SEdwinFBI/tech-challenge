import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Heart, LogOut, MapPin, Package, UserCog } from 'lucide-react';
import { useAuth } from '@/features/auth';

const LINKS = [
  { to: '/cuenta/pedidos', label: 'Mis pedidos', icon: Package, clientOnly: true },
  { to: '/cuenta/favoritos', label: 'Favoritos', icon: Heart, clientOnly: true },
  { to: '/cuenta/direcciones', label: 'Mis direcciones', icon: MapPin, clientOnly: true },
  { to: '/cuenta/perfil', label: 'Mi perfil', icon: UserCog, clientOnly: false },
];

export const AccountLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = LINKS.filter(l => !l.clientOnly || user?.rol === 'CLIENTE');

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-[calc(var(--header-h,7rem)+1rem)] lg:self-start">
        <div className="mb-4 flex items-center gap-3 rounded-card bg-brand-soft p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
            {user?.nombreCompleto.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">Hola, {user?.nombreCompleto.split(' ')[0]}</p>
            <p className="truncate text-xs text-slate-500">{user?.correo}</p>
          </div>
        </div>

        <nav aria-label="Mi cuenta" className="scrollbar-none flex min-w-0 max-w-full gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-bold transition lg:rounded-xl ${
                  isActive ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 lg:bg-transparent lg:hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="hidden items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50 lg:flex"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
};
