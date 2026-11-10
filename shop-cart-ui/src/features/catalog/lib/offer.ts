import { discountPercent, round2 } from '@/shared/lib/pricing';

export type OfferMode = 'off' | 'ahora' | 'antes';

export interface OfferDraft {
  mode: OfferMode;
  antes: string;
  ahora: string;
  pct: string;
}

export const EMPTY_OFFER: OfferDraft = { mode: 'off', antes: '', ahora: '', pct: '' };

export const cleanDecimal = (raw: string): string => raw.replace(/[^0-9.]/g, '');

export const formatPct = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, ''));

export function pctOf(before: number, now: number): number {
  if (!(before > 0) || !(now > 0) || !(before > now)) return 0;
  return round2(((before - now) * 100) / before);
}

export function pctFromBefore(antes: number, price: number): number {
  return price > 0 ? discountPercent(antes, price) : 0;
}

export function beforeFromPct(pct: number, price: number): number {
  if (!(price > 0) || !(pct > 0) || pct >= 100) return 0;
  return round2((price * 100) / (100 - pct));
}

export function nowFromPct(pct: number, base: number): number {
  if (!(base > 0) || !(pct > 0) || pct >= 100) return 0;
  return round2(base * (1 - pct / 100));
}

export function withBefore(draft: OfferDraft, raw: string, price: number): OfferDraft {
  const antes = cleanDecimal(raw);
  const pct = pctFromBefore(Number(antes), price);
  return { ...draft, antes, pct: pct > 0 ? String(pct) : '' };
}

export function withPct(draft: OfferDraft, raw: string, price: number): OfferDraft {
  const pct = cleanDecimal(raw);
  const before = beforeFromPct(Number(pct), price);
  return { ...draft, pct, antes: before > 0 ? before.toFixed(2) : '' };
}

export function withNow(draft: OfferDraft, raw: string, base: number): OfferDraft {
  const ahora = cleanDecimal(raw);
  const pct = pctOf(base, Number(ahora));
  return { ...draft, ahora, pct: pct > 0 ? formatPct(pct) : '' };
}

export function withPctNow(draft: OfferDraft, raw: string, base: number): OfferDraft {
  const pct = cleanDecimal(raw);
  const now = nowFromPct(Number(pct), base);
  return { ...draft, pct, ahora: now > 0 ? now.toFixed(2) : '' };
}

export function rebase(draft: OfferDraft, price: number): OfferDraft {
  if (draft.mode === 'off' || !draft.pct) return draft;
  return draft.mode === 'ahora' ? withPctNow(draft, draft.pct, price) : withPct(draft, draft.pct, price);
}

export function offerError(draft: OfferDraft, price: number, showEmpty: boolean): string | null {
  if (draft.mode === 'off') return null;
  const pct = Number(draft.pct);
  const value = Number(draft.mode === 'ahora' ? draft.ahora : draft.antes);
  const empty = (draft.mode === 'ahora' ? draft.ahora : draft.antes) === '';
  if (empty && draft.pct === '') {
    if (!showEmpty) return null;
    return draft.mode === 'ahora' ? 'Escribe el precio ahora o el % de descuento.' : 'Escribe el precio antes o el % de descuento.';
  }
  if (empty && pct >= 100) return 'El descuento debe ser menor a 100%.';
  if (draft.mode === 'ahora') {
    if (!(value > 0)) return 'El precio ahora debe ser mayor a cero.';
    if (value >= price) return 'El precio ahora debe ser menor al precio actual.';
    if (pctOf(price, value) < 1) return 'El descuento debe ser de al menos 1%.';
    return null;
  }
  if (!Number.isFinite(value) || value <= price) return 'El precio antes debe ser mayor al precio actual.';
  if (pctFromBefore(value, price) < 1) return 'El descuento debe ser de al menos 1%.';
  return null;
}

export function referenceFor(variantPrice: number, basePrice: number, antes: number): number {
  const exact = variantPrice === basePrice ? antes : round2((variantPrice * antes) / basePrice);
  return exact > variantPrice ? exact : round2(variantPrice + 0.01);
}

export function nowFor(variantBefore: number, minBefore: number, ahora: number): number {
  const exact = variantBefore === minBefore ? ahora : round2((variantBefore * ahora) / minBefore);
  if (exact >= variantBefore) return round2(variantBefore - 0.01);
  return exact > 0 ? exact : 0.01;
}

export const isOfferComplete = (draft: OfferDraft): boolean =>
  draft.mode !== 'off' && (draft.mode === 'ahora' ? draft.ahora : draft.antes) !== '';
