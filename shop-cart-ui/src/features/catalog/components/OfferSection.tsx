import React from 'react';
import { Input } from '@/shared/ui';
import { PriceTag, DiscountBadge } from '@/shared/ui/PriceTag';
import { EMPTY_OFFER, OfferDraft, OfferMode, isOfferComplete, offerError, pctFromBefore, pctOf, withBefore, withNow, withPct, withPctNow } from '../lib/offer';

export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  hint,
  disabled,
}) => (
  <label className={`flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <span>
      <span className="block text-sm font-bold text-slate-900">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
    </span>
    <span className="relative inline-flex shrink-0">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  </label>
);

export interface OfferSectionProps {
  draft: OfferDraft;
  onChange: (next: OfferDraft) => void;
  price: number;
  base?: number;
  multiPrice?: boolean;
  showEmptyError?: boolean;
  disabled?: boolean;
}

export const OfferSection: React.FC<OfferSectionProps> = ({ draft, onChange, price, base, multiPrice = false, showEmptyError = false, disabled }) => {
  const reference = draft.mode === 'ahora' ? (base ?? price) : price;
  const referenceOk = Number.isFinite(reference) && reference > 0;
  const error = referenceOk ? offerError(draft, reference, showEmptyError) : draft.mode !== 'off' ? 'Escribe primero el precio.' : null;
  const valid = referenceOk && !error && isOfferComplete(draft);
  const toggle = (mode: OfferMode) => (on: boolean) => onChange(on ? { ...EMPTY_OFFER, mode } : EMPTY_OFFER);

  const shownNow = draft.mode === 'ahora' ? Number(draft.ahora) : price;
  const shownBefore = draft.mode === 'ahora' ? reference : Number(draft.antes);
  const pct = draft.mode === 'ahora' ? Math.round(pctOf(reference, shownNow)) : pctFromBefore(shownBefore, price);

  return (
    <div className="space-y-3">
      <Switch
        checked={draft.mode === 'ahora'}
        disabled={disabled}
        onChange={toggle('ahora')}
        label="Poner en oferta"
        hint="Baja el precio. El precio actual queda como “antes”."
      />
      <Switch
        checked={draft.mode === 'antes'}
        disabled={disabled}
        onChange={toggle('antes')}
        label="Marcar como oferta"
        hint="El precio no cambia. Se muestra el “antes” tachado."
      />
      {draft.mode !== 'off' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            {draft.mode === 'ahora' ? (
              <Input
                label="Precio ahora (Q)"
                inputMode="decimal"
                value={draft.ahora}
                disabled={disabled}
                onChange={e => onChange(withNow(draft, e.target.value, reference))}
                placeholder="190.00"
              />
            ) : (
              <Input
                label="Precio antes (Q)"
                inputMode="decimal"
                value={draft.antes}
                disabled={disabled}
                onChange={e => onChange(withBefore(draft, e.target.value, price))}
                placeholder="200.00"
              />
            )}
            <Input
              label="% de descuento"
              inputMode="decimal"
              value={draft.pct}
              disabled={disabled}
              onChange={e => onChange(draft.mode === 'ahora' ? withPctNow(draft, e.target.value, reference) : withPct(draft, e.target.value, price))}
              placeholder="20"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
          {valid && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-3" aria-live="polite" data-testid="offer-preview">
              <PriceTag amount={shownNow} compareAt={shownBefore} tone="sale" size="lg" from={multiPrice} />
              <DiscountBadge percent={pct} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
