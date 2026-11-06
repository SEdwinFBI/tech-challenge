import React, { useEffect, useRef, useState } from 'react';
import { plural } from '@/shared/lib/formatters';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Heart, LayoutGrid, ShoppingCart, PackageOpen, Tag, Flame, Star, Truck } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useCart } from '@/features/cart/hooks/useCart';
import { useFavorites } from '@/features/wishlist/hooks/useFavorites';
import { MobileSearch, SearchBox } from './SearchBox';
import { MegaMenu } from './MegaMenu';
import { AccountMenu } from './AccountMenu';
import { MobileBottomNav } from './MobileBottomNav';
import { BrandMark } from '@/shared/ui/BrandMark';

export { BrandMark };

const SUBNAV = [
  { to: '/ofertas', label: 'Ofertas', icon: <Tag className="h-3.5 w-3.5" /> },
  { to: '/novedades', label: 'Lo nuevo', icon: <PackageOpen className="h-3.5 w-3.5" /> },
  { to: '/catalogo?orden=MAS_VENDIDOS', label: 'Más vendidos', icon: <Flame className="h-3.5 w-3.5" /> },
  { to: '/catalogo?orden=DESTACADOS', label: 'Destacados', icon: <Star className="h-3.5 w-3.5" /> },
];

export const StoreLayout: React.FC = () => {
  const { user } = useAuth();
  const { totalItemsCount } = useCart();
  const { ids } = useFavorites();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(112);

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight));
    ro.observe(el);
    setHeaderH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const iconBtn =
    'relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15';

  return (
    <div
      className="flex min-h-screen flex-col bg-white pb-16 text-slate-800 lg:pb-0"
      style={{ ['--header-h' as string]: `${headerH}px` }}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-cta focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-cta-fg"
      >
        Saltar al contenido
      </a>

      <header ref={headerRef} className="sticky top-0 z-40 bg-brand text-white shadow-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Inicio" className="shrink-0">
            <BrandMark />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className={`hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition md:flex ${
              menuOpen ? 'bg-white text-brand' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Categorías
          </button>

          <SearchBox className="ml-auto hidden flex-1 md:block md:max-w-2xl" />

          <nav className="ml-auto flex items-center gap-1 md:ml-0" aria-label="Acciones de la cuenta">
            <Link
              to={user?.rol === 'CLIENTE' ? '/cuenta/favoritos' : '/login'}
              className={iconBtn}
              aria-label={`Favoritos${ids.length ? `, ${ids.length}` : ''}`}
            >
              <Heart className="h-5 w-5" />
              {ids.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[10px] font-bold">
                  {ids.length}
                </span>
              )}
            </Link>
            <Link to="/carrito" className={iconBtn} aria-label={`Carrito, ${plural(totalItemsCount, 'producto')}`}>
              <ShoppingCart className="h-5 w-5" />
              {totalItemsCount > 0 && (
                <span
                  key={totalItemsCount}
                  className="absolute right-0 top-0 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-cta px-1 text-[11px] font-extrabold text-cta-fg"
                >
                  {totalItemsCount}
                </span>
              )}
            </Link>
            <AccountMenu />
          </nav>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <MobileSearch />
        </div>

        <div className="hidden bg-brand-deep md:block">
          <div className="mx-auto flex h-10 w-full max-w-7xl items-center justify-between px-4 text-[13px] font-semibold sm:px-6 lg:px-8">
            <ul className="flex items-center gap-1">
              {SUBNAV.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <MegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="mt-12 bg-brand-deep text-white/80">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <BrandMark priority={false} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-extrabold text-white">Tienda</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/catalogo">Todo el catálogo</Link></li>
              <li><Link className="hover:text-white" to="/ofertas">Ofertas</Link></li>
              <li><Link className="hover:text-white" to="/novedades">Lo nuevo</Link></li>
              <li><Link className="hover:text-white" to="/catalogo?orden=MAS_VENDIDOS">Más vendidos</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-extrabold text-white">Mi cuenta</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/cuenta/pedidos">Mis pedidos</Link></li>
              <li><Link className="hover:text-white" to="/cuenta/favoritos">Favoritos</Link></li>
              <li><Link className="hover:text-white" to="/cuenta/direcciones">Mis direcciones</Link></li>
              <li><Link className="hover:text-white" to="/cuenta/perfil">Mi perfil</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-extrabold text-white">Envíos</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-cta" /> A todos los departamentos.</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/55">
          © 2026 ShopCart por Santos Edwin Baquiax
        </div>
      </footer>

      <MobileBottomNav onOpenCategories={() => setMenuOpen(true)} cartCount={totalItemsCount} />
    </div>
  );
};
