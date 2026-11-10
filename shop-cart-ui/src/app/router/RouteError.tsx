import React from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';

export const RouteError: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <ErrorState
      className="w-full max-w-md"
      title="No se pudo cargar la página"
      message="Ocurrió un error inesperado. Recarga para intentarlo de nuevo."
      onRetry={() => window.location.reload()}
    />
  </div>
);
