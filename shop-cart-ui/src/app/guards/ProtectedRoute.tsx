import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole } from '@/shared/types/domain';
import { BrandLoader } from '@/shared/ui/BrandLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuth(s => s.user);
  const status = useAuth(s => s.status);
  const location = useLocation();

  if (status === 'initializing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <BrandLoader size={200} label="Cargando…" />
      </div>
    );
  }

  if (status === 'unknown') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3 text-center">
          <BrandLoader size={160} label="Reconectando…" showLabel />
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
