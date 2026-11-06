import React, { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/shared/ui/Toast';
import { useAuth } from '@/features/auth';
import { errorCode } from '@/shared/lib/apiErrors';
import { BrandLoader } from '@/shared/ui/BrandLoader';
import { ConnectionLayer } from './ConnectionLayer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => errorCode(error) !== 'SIN_CONEXION' && failureCount < 1,
      staleTime: 1000 * 30,
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initializeAuth = useAuth((s) => s.initializeAuth);
  const [initialized, setInitialized] = useState(false);

  // Otro usuario: carrito y datos en caché ya no sirven
  const userId = useAuth((s) => s.user?.idUsuario ?? null);
  const previousUserId = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (previousUserId.current === undefined) {
      previousUserId.current = userId;
      return;
    }
    if (previousUserId.current !== userId) {
      previousUserId.current = userId;
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      ['favorites', 'addresses', 'my-orders', 'order-detail'].forEach((k) => queryClient.removeQueries({ queryKey: [k] }));
    }
  }, [userId]);

  useEffect(() => {
    initializeAuth().finally(() => {
      setInitialized(true);
    });
  }, [initializeAuth]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <BrandLoader size={200} label="Cargando…" showLabel />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
      <ConnectionLayer />
    </QueryClientProvider>
  );
};
