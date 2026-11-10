import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router';
import { StoreLayout } from '../layouts/StoreLayout';
import { CheckoutLayout } from '../layouts/CheckoutLayout';
import { AccountLayout } from '../layouts/AccountLayout';
import { BackofficeLayout } from '../layouts/BackofficeLayout';
import { ProtectedRoute } from '../guards/ProtectedRoute';
import { GuestOnlyRoute } from '../guards/GuestOnlyRoute';

import { HomePage } from '@/features/home';
import { CatalogPage, ProductDetailPage } from '@/features/catalog';
import { CartPage } from '@/features/cart';
import { CheckoutPage, MyAddressesPage } from '@/features/checkout';
import { MyOrdersPage, OrderDetailPage, OrderConfirmationPage } from '@/features/orders';
import { FavoritesPage } from '@/features/wishlist';
import { ProfilePage } from '@/features/account';

import { LoginPage, RegisterPage } from '@/features/auth';

import { AdminOrdersPage, AdminOrderDetailPage } from '@/features/orders';
import { AdminCatalogPage } from '@/features/catalog';
import { AdminInventoryPage } from '@/features/inventory';
import { AdminCouponsPage } from '@/features/coupons';
import { AdminDashboardPage } from '@/features/dashboard';
import { AdminUsersPage } from '@/features/users';
import { AdminAuditLogPage } from '@/features/audit-log';
import { AdminPaymentsPage } from '@/features/payments';

import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

type Role = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';

type Guard = { kind: 'auth'; roles?: readonly Role[] } | { kind: 'guest' };

interface RouteNode {
  path?: string;
  index?: boolean;
  element: React.ReactElement;
  guard?: Guard;
  children?: RouteNode[];
}

const LegacyOrderRedirect: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/cuenta/pedidos/${id}`} replace />;
};

const guards = {
  auth: { kind: 'auth' },
  cliente: { kind: 'auth', roles: ['CLIENTE'] },
  backoffice: { kind: 'auth', roles: ['OPERADOR', 'ADMINISTRADOR'] },
  admin: { kind: 'auth', roles: ['ADMINISTRADOR'] },
  guest: { kind: 'guest' },
} as const satisfies Record<string, Guard>;

const routeConfig: RouteNode[] = [
  {
    element: <StoreLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/catalogo', element: <CatalogPage mode="all" /> },
      { path: '/categoria/:id', element: <CatalogPage mode="categoria" /> },
      { path: '/ofertas', element: <CatalogPage mode="ofertas" /> },
      { path: '/novedades', element: <CatalogPage mode="novedades" /> },
      { path: '/producto/:id', element: <ProductDetailPage /> },
      { path: '/carrito', element: <CartPage /> },
      { path: '/pedido/:id/confirmado', element: <OrderConfirmationPage />, guard: guards.cliente },
      {
        path: '/cuenta',
        element: <AccountLayout />,
        guard: guards.auth,
        children: [
          { index: true, element: <Navigate to="/cuenta/pedidos" replace /> },
          { path: 'pedidos', element: <MyOrdersPage />, guard: guards.cliente },
          { path: 'pedidos/:id', element: <OrderDetailPage />, guard: guards.cliente },
          { path: 'favoritos', element: <FavoritesPage />, guard: guards.cliente },
          { path: 'perfil', element: <ProfilePage /> },
          { path: 'direcciones', element: <MyAddressesPage />, guard: guards.cliente },
        ],
      },
      { path: '/mis-pedidos', element: <Navigate to="/cuenta/pedidos" replace /> },
      { path: '/mis-pedidos/:id', element: <LegacyOrderRedirect /> },
      { path: '/mis-direcciones', element: <Navigate to="/cuenta/direcciones" replace /> },
    ],
  },
  {
    element: <CheckoutLayout />,
    guard: guards.cliente,
    children: [{ path: '/checkout', element: <CheckoutPage /> }],
  },
  { path: '/login', element: <LoginPage />, guard: guards.guest },
  { path: '/registro', element: <RegisterPage />, guard: guards.guest },
  {
    path: '/admin',
    element: <BackofficeLayout />,
    guard: guards.backoffice,
    children: [
      { index: true, element: <Navigate to="/admin/pedidos" replace /> },
      { path: 'pedidos', element: <AdminOrdersPage /> },
      { path: 'pedidos/:id', element: <AdminOrderDetailPage /> },
      { path: 'inventario', element: <AdminInventoryPage /> },
      { path: 'dashboard', element: <AdminDashboardPage />, guard: guards.admin },
      { path: 'catalogo', element: <AdminCatalogPage />, guard: guards.admin },
      { path: 'cupones', element: <AdminCouponsPage />, guard: guards.admin },
      { path: 'usuarios', element: <AdminUsersPage />, guard: guards.admin },
      { path: 'pagos', element: <AdminPaymentsPage />, guard: guards.admin },
      { path: 'bitacora', element: <AdminAuditLogPage />, guard: guards.admin },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];

const withGuard = (guard: Guard | undefined, element: React.ReactElement): React.ReactElement => {
  if (!guard) return element;
  if (guard.kind === 'guest') return <GuestOnlyRoute>{element}</GuestOnlyRoute>;
  return <ProtectedRoute allowedRoles={guard.roles ? [...guard.roles] : undefined}>{element}</ProtectedRoute>;
};

const renderRoutes = (nodes: RouteNode[]): React.ReactElement[] =>
  nodes.map((node, i) => {
    const element = withGuard(node.guard, node.element);
    const key = node.path ?? (node.index ? 'index' : `layout-${i}`);
    if (node.index) return <Route key={key} index element={element} />;
    return (
      <Route key={key} path={node.path} element={element}>
        {node.children && renderRoutes(node.children)}
      </Route>
    );
  });

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>{renderRoutes(routeConfig)}</Routes>
  </BrowserRouter>
);
