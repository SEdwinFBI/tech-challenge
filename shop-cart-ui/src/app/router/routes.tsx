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

import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

const LegacyOrderRedirect: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/cuenta/pedidos/${id}`} replace />;
};

const CLIENT = ['CLIENTE'] as const;

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogo" element={<CatalogPage mode="all" />} />
          <Route path="/categoria/:id" element={<CatalogPage mode="categoria" />} />
          <Route path="/ofertas" element={<CatalogPage mode="ofertas" />} />
          <Route path="/novedades" element={<CatalogPage mode="novedades" />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route
            path="/pedido/:id/confirmado"
            element={
              <ProtectedRoute allowedRoles={[...CLIENT]}>
                <OrderConfirmationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cuenta"
            element={
              <ProtectedRoute>
                <AccountLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/cuenta/pedidos" replace />} />
            <Route
              path="pedidos"
              element={
                <ProtectedRoute allowedRoles={[...CLIENT]}>
                  <MyOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pedidos/:id"
              element={
                <ProtectedRoute allowedRoles={[...CLIENT]}>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="favoritos"
              element={
                <ProtectedRoute allowedRoles={[...CLIENT]}>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route path="perfil" element={<ProfilePage />} />
            <Route
              path="direcciones"
              element={
                <ProtectedRoute allowedRoles={[...CLIENT]}>
                  <MyAddressesPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* rutas viejas, se dejan para no romper enlaces */}
          <Route path="/mis-pedidos" element={<Navigate to="/cuenta/pedidos" replace />} />
          <Route path="/mis-pedidos/:id" element={<LegacyOrderRedirect />} />
          <Route path="/mis-direcciones" element={<Navigate to="/cuenta/direcciones" replace />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={[...CLIENT]}>
              <CheckoutLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/registro"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['OPERADOR', 'ADMINISTRADOR']}>
              <BackofficeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/pedidos" replace />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
          <Route path="pedidos/:id" element={<AdminOrderDetailPage />} />
          <Route path="inventario" element={<AdminInventoryPage />} />

          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalogo"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                <AdminCatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cupones"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                <AdminCouponsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="usuarios"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="bitacora"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                <AdminAuditLogPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
