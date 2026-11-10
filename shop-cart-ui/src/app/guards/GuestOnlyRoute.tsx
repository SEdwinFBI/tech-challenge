import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Skeleton } from '@/shared/ui';

export const GuestOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuth(s => s.user);
  const status = useAuth(s => s.status);
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (status === 'initializing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    );
  }

  if (status === 'authenticated' && user) {
    const isStaff = user.rol === 'ADMINISTRADOR' || user.rol === 'OPERADOR';
    if (from && from.startsWith('/admin') === isStaff) {
      return <Navigate to={from} replace />;
    }
    if (isStaff) {
      return <Navigate to="/admin/pedidos" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
