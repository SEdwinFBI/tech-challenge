import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/features/auth';
import { Skeleton } from '@/shared/ui';

export const GuestOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, status } = useAuth();

  if (status === 'initializing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    );
  }

  if (status === 'authenticated' && user) {
    if (user.rol === 'ADMINISTRADOR' || user.rol === 'OPERADOR') {
      return <Navigate to="/admin/pedidos" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
