export interface OfferDraft {
  on: boolean;
  antes: string;
  pct: string;
}

export const EMPTY_OFFER: OfferDraft = { on: false, antes: '', pct: '' };

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const cleanDecimal = (raw: string): string => raw.replace(/[^0-9.]/g, '');

export function pctFromBefore(antes: number, price: number): number {
  if (!(price > 0) || !(antes > price)) return 0;
  return Math.round(((antes - price) * 100) / antes);
}

export function beforeFromPct(pct: number, price: number): number {
  if (!(price > 0) || !(pct > 0) || pct >= 100) return 0;
  return round2((price * 100) / (100 - pct));
}

export function withBefore(draft: OfferDraft, raw: string, price: number): OfferDraft {
  const antes = cleanDecimal(raw);
  const value = Number(antes);
  const pct = pctFromBefore(value, price);
  return { ...draft, antes, pct: pct > 0 ? String(pct) : '' };
}

export function withPct(draft: OfferDraft, raw: string, price: number): OfferDraft {
  const pct = cleanDecimal(raw);
  const before = beforeFromPct(Number(pct), price);
  return { ...draft, pct, antes: before > 0 ? before.toFixed(2) : '' };
}

export function offerFromReference(reference: number | null | undefined, price: number): OfferDraft {
  if (reference == null || !(reference > price)) return EMPTY_OFFER;
  return { on: true, antes: String(reference), pct: String(pctFromBefore(reference, price)) };
}

export function offerError(draft: OfferDraft, price: number, showEmpty: boolean): string | null {
  if (!draft.on) return null;
  const antes = Number(draft.antes);
  const pct = Number(draft.pct);
  if (draft.antes === '' && draft.pct === '') return showEmpty ? 'Escribe el precio antes o el % de descuento.' : null;
  if (draft.antes === '' && pct >= 100) return 'El descuento debe ser menor a 100%.';
  if (!Number.isFinite(antes) || antes <= price) return 'El precio antes debe ser mayor al precio actual.';
  if (pctFromBefore(antes, price) < 1) return 'El descuento debe ser de al menos 1%.';
  return null;
}

export function referenceFor(variantPrice: number, basePrice: number, antes: number): number {
  const exact = variantPrice === basePrice ? antes : round2((variantPrice * antes) / basePrice);
  return exact > variantPrice ? exact : round2(variantPrice + 0.01);
}
