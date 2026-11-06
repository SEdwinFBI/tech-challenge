import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { UserRole } from '@/shared/types/domain';
import { Skeleton } from '@/shared/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
          <Skeleton variant="text" className="w-2/3 mx-auto h-5" />
          <Skeleton variant="text" className="w-full h-4" />
          <Skeleton variant="text" className="w-4/5 h-4" />
        </div>
      </div>
    );
  }

  if (status === 'unknown') {
    return (
      <div role="status" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-base font-extrabold text-slate-900">Reconectando…</p>
          <p className="text-sm text-slate-500">No se pudo conectar con el servidor. Tu sesión sigue guardada y se retomará sola.</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
