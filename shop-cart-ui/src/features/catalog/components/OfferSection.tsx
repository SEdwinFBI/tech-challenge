import React from 'react';
import { Input } from '@/shared/ui';
import { PriceTag, DiscountBadge } from '@/shared/ui/PriceTag';
import { formatMoney } from '@/shared/lib/formatters';
import { OfferDraft, offerError, pctFromBefore, withBefore, withPct } from '../lib/offer';

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
  multiPrice?: boolean;
  showEmptyError?: boolean;
  disabled?: boolean;
}

export const OfferSection: React.FC<OfferSectionProps> = ({ draft, onChange, price, multiPrice = false, showEmptyError = false, disabled }) => {
  const priceOk = Number.isFinite(price) && price > 0;
  const error = priceOk ? offerError(draft, price, showEmptyError) : draft.on ? 'Escribe primero el precio.' : null;
  const antes = Number(draft.antes);
  const pct = priceOk && antes > price ? pctFromBefore(antes, price) : 0;
  const valid = draft.on && priceOk && !error && draft.antes !== '';

  return (
    <div className="space-y-3">
      <Switch
        checked={draft.on}
        disabled={disabled}
        onChange={on => onChange(on ? { ...draft, on } : { on: false, antes: '', pct: '' })}
        label="Mostrar como oferta"
        hint="El cliente paga el Precio. El precio antes solo se muestra tachado."
      />
      {draft.on && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio antes (Q)"
              inputMode="decimal"
              value={draft.antes}
              disabled={disabled}
              onChange={e => onChange(withBefore(draft, e.target.value, price))}
              placeholder="200.00"
            />
            <Input
              label="% de descuento"
              inputMode="decimal"
              value={draft.pct}
              disabled={disabled}
              onChange={e => onChange(withPct(draft, e.target.value, price))}
              placeholder="20"
            />
          </div>
          <p className="text-xs text-slate-500">Escribe uno de los dos; el otro se calcula solo.</p>
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
          {valid && (
            <div className="rounded-xl bg-canvas p-3" aria-live="polite">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Así lo verá el cliente</p>
              <div className="flex flex-wrap items-center gap-2">
                <PriceTag amount={price} compareAt={antes} tone="sale" size="lg" from={multiPrice} />
                <DiscountBadge percent={pct} />
              </div>
              <p className="mt-1 text-xs text-slate-600" data-testid="offer-preview-text">
                {multiPrice && 'Desde '}Antes {formatMoney(antes)} → Ahora {formatMoney(price)} · -{pct}%
              </p>
              {multiPrice && <p className="mt-1 text-xs text-slate-500">Hay variantes con precios distintos: se usa el menor y el mismo descuento se aplica a las demás.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
