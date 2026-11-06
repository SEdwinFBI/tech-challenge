import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, RefreshCw, Share, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { isIosSafari, isStandalone, usePwa } from '@/shared/lib/pwa';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/ui/toastStore';

const IOS_HINT_KEY = 'shopcart:ios-install-hint';

export const ConnectionLayer: React.FC = () => {
  const online = useOnlineStatus();
  const reconnecting = useAuth((s) => s.reconnecting);
  const authStatus = useAuth((s) => s.status);
  const trySilentRefresh = useAuth((s) => s.trySilentRefresh);
  const queryClient = useQueryClient();
  const wasOffline = useRef(!online);
  const updateReady = usePwa((s) => s.updateReady);
  const applyUpdate = usePwa((s) => s.applyUpdate);
  const [iosHint, setIosHint] = useState(
    () => isIosSafari() && !isStandalone() && localStorage.getItem(IOS_HINT_KEY) !== '1',
  );

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success('Conexión restablecida');
      void queryClient.invalidateQueries();
    }
  }, [online, queryClient]);

  const dismissIosHint = () => {
    localStorage.setItem(IOS_HINT_KEY, '1');
    setIosHint(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-4">
      {!online && (
        <div role="status" className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lift">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
          Sin conexión. Algunas acciones no están disponibles.
        </div>
      )}
      {online && reconnecting && (
        <div role="status" className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lift">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-300" />
          No se pudo conectar con el servidor. Reintentando…
          {authStatus !== 'initializing' && (
            <button type="button" onClick={() => void trySilentRefresh()} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold hover:bg-white/25">
              Reintentar
            </button>
          )}
        </div>
      )}
      {updateReady && (
        <div role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-white py-2 pl-4 pr-2 text-sm font-semibold text-slate-800 shadow-lift ring-1 ring-slate-200">
          <RefreshCw className="h-4 w-4 shrink-0 text-brand" />
          Hay una versión nueva
          <button type="button" onClick={applyUpdate} className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-hover">
            Actualizar
          </button>
        </div>
      )}
      {iosHint && (
        <div role="note" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-white py-2.5 pl-4 pr-2 text-sm text-slate-700 shadow-lift ring-1 ring-slate-200">
          <Download className="h-4 w-4 shrink-0 text-brand" />
          <span>
            Instala la app: <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Compartir → Agregar a inicio
          </span>
          <button type="button" onClick={dismissIosHint} aria-label="Cerrar aviso" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
