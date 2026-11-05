import React, { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/shared/ui/Toast';
import { useAuth } from '@/features/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30,
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 animate-pulse">
          SC
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">Cargando…</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
    </QueryClientProvider>
  );
};
