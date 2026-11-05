import React, { useEffect, useRef, useState } from 'react';
import { Loader2, TicketPercent } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { useCart } from '../hooks/useCart';

export interface CouponDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CouponDialog: React.FC<CouponDialogProps> = ({ isOpen, onClose }) => {
  const { cart, applyCoupon, isApplyingCoupon } = useCart();
  const [code, setCode] = useState('');
  const submitted = useRef(false);
  const applied = cart?.cupon?.codigo;

  useEffect(() => {
    if (isOpen) {
      setCode('');
      submitted.current = false;
    }
  }, [isOpen]);

  // Cierra solo si el servidor aceptó el cupón
  useEffect(() => {
    if (isOpen && submitted.current && applied && !isApplyingCoupon) {
      submitted.current = false;
      onClose();
    }
  }, [applied, isApplyingCoupon, isOpen, onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    submitted.current = true;
    applyCoupon(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cupón" maxWidth="sm">
      <form onSubmit={submit} className="space-y-4">
        {applied && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Reemplazará a <strong>{applied}</strong>.
          </p>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Código</span>
          <div className="relative">
            <TicketPercent className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="BIENVENIDA15"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-bold tracking-wider outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={!code.trim() || isApplyingCoupon}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-extrabold text-cta-fg transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplyingCoupon && <Loader2 className="h-4 w-4 animate-spin" />}
          Aplicar cupón
        </button>
      </form>
    </Modal>
  );
};
