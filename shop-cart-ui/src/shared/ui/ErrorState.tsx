import React from 'react';
import { AlertCircle, RotateCcw, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  className = '',
}) => {
  const online = useOnlineStatus();
  title = online ? (title ?? 'Algo salió mal') : 'Sin conexión';
  message = online ? (message ?? 'No se pudo cargar la información.') : 'No hay conexión con el servidor. Revisa tu internet.';
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-rose-50/50 rounded-2xl border border-rose-200 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
        {online ? <AlertCircle className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-sm text-rose-700 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="md" leftIcon={<RotateCcw className="w-4 h-4 mr-1.5" />}>
          Reintentar
        </Button>
      )}
    </div>
  );
};
