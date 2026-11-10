import React from 'react';
import { createBrowserRouter, Navigate, Outlet, useParams, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { StoreLayout } from '../layouts/StoreLayout';
import { ProtectedRoute } from '../guards/ProtectedRoute';
import { GuestOnlyRoute } from '../guards/GuestOnlyRoute';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteError } from './RouteError';
import { RouteFallback } from './RouteFallback';
import type { CatalogPage } from '@/features/catalog/pages/CatalogPage';

type Role = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';
type CatalogMode = React.ComponentProps<typeof CatalogPage>['mode'];

const roles = {
  cliente: ['CLIENTE'],
  backoffice: ['OPERADOR', 'ADMINISTRADOR'],
  admin: ['ADMINISTRADOR'],
} as const satisfies Record<string, readonly Role[]>;

const LegacyOrderRedirect: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/cuenta/pedidos/${id}`} replace />;
};

const lazyComponent = (load: () => Promise<React.ComponentType>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: await load() }),
});

const catalog = (mode: CatalogMode): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => {
    const { CatalogPage } = await import('@/features/catalog/pages/CatalogPage');
    return { element: <CatalogPage mode={mode} /> };
  },
});

const redirect = (to: string): Pick<RouteObject, 'element'> => ({ element: <Navigate to={to} replace /> });

const requireSession = (children: RouteObject[], allowed?: readonly Role[]): RouteObject => ({
  element: (
    <ProtectedRoute allowedRoles={allowed ? [...allowed] : undefined}>
      <Outlet />
    </ProtectedRoute>
  ),
  children,
});

const guestOnly = (children: RouteObject[]): RouteObject => ({
  element: (
    <GuestOnlyRoute>
      <Outlet />
    </GuestOnlyRoute>
  ),
  children,
});

const routeObjects: RouteObject[] = [
  {
    HydrateFallback: RouteFallback,
    errorElement: <RouteError />,
    children: [
      {
        element: <StoreLayout />,
        children: [
          { path: '/', ...lazyComponent(() => import('@/features/home/pages/HomePage').then(m => m.HomePage)) },
          { path: '/catalogo', ...catalog('all') },
          { path: '/categoria/:id', ...catalog('categoria') },
          { path: '/ofertas', ...catalog('ofertas') },
          { path: '/novedades', ...catalog('novedades') },
          { path: '/producto/:id', ...lazyComponent(() => import('@/features/catalog/pages/ProductDetailPage').then(m => m.ProductDetailPage)) },
          { path: '/carrito', ...lazyComponent(() => import('@/features/cart/pages/CartPage').then(m => m.CartPage)) },
          requireSession(
            [{ path: '/pedido/:id/confirmado', ...lazyComponent(() => import('@/features/orders/pages/OrderConfirmationPage').then(m => m.OrderConfirmationPage)) }],
            roles.cliente,
          ),
          requireSession([
            {
              path: '/cuenta',
              ...lazyComponent(() => import('../layouts/AccountLayout').then(m => m.AccountLayout)),
              children: [
                { index: true, ...redirect('/cuenta/pedidos') },
                requireSession(
                  [
                    { path: 'pedidos', ...lazyComponent(() => import('@/features/orders/pages/MyOrdersPage').then(m => m.MyOrdersPage)) },
                    { path: 'pedidos/:id', ...lazyComponent(() => import('@/features/orders/pages/OrderDetailPage').then(m => m.OrderDetailPage)) },
                    { path: 'favoritos', ...lazyComponent(() => import('@/features/wishlist/pages/FavoritesPage').then(m => m.FavoritesPage)) },
                    { path: 'direcciones', ...lazyComponent(() => import('@/features/checkout/pages/MyAddressesPage').then(m => m.MyAddressesPage)) },
                  ],
                  roles.cliente,
                ),
                { path: 'perfil', ...lazyComponent(() => import('@/features/account/pages/ProfilePage').then(m => m.ProfilePage)) },
              ],
            },
          ]),
          { path: '/mis-pedidos', ...redirect('/cuenta/pedidos') },
          { path: '/mis-pedidos/:id', element: <LegacyOrderRedirect /> },
          { path: '/mis-direcciones', ...redirect('/cuenta/direcciones') },
        ],
      },
      requireSession(
        [
          {
            ...lazyComponent(() => import('../layouts/CheckoutLayout').then(m => m.CheckoutLayout)),
            children: [{ path: '/checkout', ...lazyComponent(() => import('@/features/checkout/pages/CheckoutPage').then(m => m.CheckoutPage)) }],
          },
        ],
        roles.cliente,
      ),
      guestOnly([
        { path: '/login', ...lazyComponent(() => import('@/features/auth/pages/LoginPage').then(m => m.LoginPage)) },
        { path: '/registro', ...lazyComponent(() => import('@/features/auth/pages/RegisterPage').then(m => m.RegisterPage)) },
      ]),
      requireSession(
        [
          {
            path: '/admin',
            ...lazyComponent(() => import('../layouts/BackofficeLayout').then(m => m.BackofficeLayout)),
            children: [
              { index: true, ...redirect('/admin/pedidos') },
              { path: 'pedidos', ...lazyComponent(() => import('@/features/orders/pages/AdminOrdersPage').then(m => m.AdminOrdersPage)) },
              { path: 'pedidos/:id', ...lazyComponent(() => import('@/features/orders/pages/AdminOrderDetailPage').then(m => m.AdminOrderDetailPage)) },
              { path: 'inventario', ...lazyComponent(() => import('@/features/inventory/pages/AdminInventoryPage').then(m => m.AdminInventoryPage)) },
              requireSession(
                [
                  { path: 'dashboard', ...lazyComponent(() => import('@/features/dashboard/pages/AdminDashboardPage').then(m => m.AdminDashboardPage)) },
                  { path: 'catalogo', ...lazyComponent(() => import('@/features/catalog/pages/AdminCatalogPage').then(m => m.AdminCatalogPage)) },
                  { path: 'cupones', ...lazyComponent(() => import('@/features/coupons/pages/AdminCouponsPage').then(m => m.AdminCouponsPage)) },
                  { path: 'usuarios', ...lazyComponent(() => import('@/features/users/pages/AdminUsersPage').then(m => m.AdminUsersPage)) },
                  { path: 'pagos', ...lazyComponent(() => import('@/features/payments/pages/AdminPaymentsPage').then(m => m.AdminPaymentsPage)) },
                  { path: 'bitacora', ...lazyComponent(() => import('@/features/audit-log/pages/AdminAuditLogPage').then(m => m.AdminAuditLogPage)) },
                ],
                roles.admin,
              ),
            ],
          },
        ],
        roles.backoffice,
      ),
      { path: '/403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routeObjects);

export const AppRouter: React.FC = () => <RouterProvider router={router} />;
