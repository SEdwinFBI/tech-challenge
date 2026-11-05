import React from 'react';
import { useToastStore, ToastItem } from './toastStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
};

const borderStyles = {
  success: 'border-l-4 border-l-emerald-500 bg-white text-slate-800 shadow-lg',
  error: 'border-l-4 border-l-rose-500 bg-white text-slate-800 shadow-lg',
  warning: 'border-l-4 border-l-amber-500 bg-white text-slate-800 shadow-lg',
  info: 'border-l-4 border-l-blue-500 bg-white text-slate-800 shadow-lg',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-lg flex items-start gap-3 transition-all duration-300 ${borderStyles[t.type]}`}
          role="alert"
        >
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">{t.title}</h4>
            {t.message && <p className="text-xs text-slate-600 mt-0.5">{t.message}</p>}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
