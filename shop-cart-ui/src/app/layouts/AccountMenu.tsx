import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Download, Heart, Loader2, LogOut, MapPin, Package, ShieldCheck, User as UserIcon, UserCog } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { usePwa } from '@/shared/lib/pwa';

const ROLE_LABEL: Record<string, string> = {
  CLIENTE: 'Cliente',
  OPERADOR: 'Operador',
  ADMINISTRADOR: 'Administrador',
};

export const AccountMenu: React.FC = () => {
  const user = useAuth(s => s.user);
  const logout = useAuth(s => s.logout);
  const status = useAuth(s => s.status);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canInstall = usePwa((s) => s.installEvent !== null && !s.installed);
  const install = usePwa((s) => s.install);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user && status === 'unknown') {
    return (
      <div role="status" className="ml-1 flex h-10 items-center gap-2 rounded-full px-3 text-xs font-bold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Reconectando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ml-1 flex items-center gap-1">
        {canInstall && (
          <button type="button" onClick={install} aria-label="Instalar app" title="Instalar app" className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15">
            <Download className="h-5 w-5" />
          </button>
        )}
        <Link to="/login" className="hidden rounded-full px-3 py-2 text-sm font-bold text-white hover:bg-white/15 sm:block">
          Ingresar
        </Link>
        <Link
          to="/registro"
          className="rounded-full bg-cta px-4 py-2 text-sm font-extrabold text-cta-fg transition hover:bg-cta-hover"
        >
          <span className="hidden sm:inline">Crear cuenta</span>
          <UserIcon className="h-4 w-4 sm:hidden" aria-label="Crear cuenta" />
        </Link>
      </div>
    );
  }

  const first = user.nombreCompleto.split(' ')[0];
  const isStaff = user.rol === 'ADMINISTRADOR' || user.rol === 'OPERADOR';
  const item =
    'flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand';

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-full bg-white/15 pl-1 pr-3 text-sm font-bold text-white transition hover:bg-white/25"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cta text-sm font-extrabold text-cta-fg">
          {user.nombreCompleto.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[110px] truncate lg:inline">{first}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl bg-white py-1 shadow-lift ring-1 ring-slate-200 animate-fade-up"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-extrabold text-slate-900">{user.nombreCompleto}</p>
            <p className="truncate text-xs text-slate-500">{user.correo}</p>
            <span className="mt-1.5 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
              {ROLE_LABEL[user.rol] ?? user.rol}
            </span>
          </div>

          {user.rol === 'CLIENTE' && (
            <>
              <Link role="menuitem" to="/cuenta/pedidos" onClick={() => setOpen(false)} className={item}>
                <Package className="h-4 w-4 text-slate-400" /> Mis pedidos
              </Link>
              <Link role="menuitem" to="/cuenta/favoritos" onClick={() => setOpen(false)} className={item}>
                <Heart className="h-4 w-4 text-slate-400" /> Favoritos
              </Link>
              <Link role="menuitem" to="/cuenta/direcciones" onClick={() => setOpen(false)} className={item}>
                <MapPin className="h-4 w-4 text-slate-400" /> Mis direcciones
              </Link>
            </>
          )}
          <Link role="menuitem" to="/cuenta/perfil" onClick={() => setOpen(false)} className={item}>
            <UserCog className="h-4 w-4 text-slate-400" /> Mi perfil
          </Link>
          {isStaff && (
            <Link
              role="menuitem"
              to={user.rol === 'ADMINISTRADOR' ? '/admin/dashboard' : '/admin/pedidos'}
              onClick={() => setOpen(false)}
              className={`${item} bg-brand-soft !text-brand`}
            >
              <ShieldCheck className="h-4 w-4" /> Panel de control
            </Link>
          )}
          {canInstall && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void install();
              }}
              className={`${item} w-full`}
            >
              <Download className="h-4 w-4 text-slate-400" /> Instalar app
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/');
            }}
            className={`${item} w-full border-t border-slate-100 !text-rose-600 hover:!bg-rose-50`}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};
