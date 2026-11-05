/** Precios con IVA 12% incluido. Desglose igual que VW_Pedidos_Historial. */

export const IVA_RATE = 0.12;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function splitIva(totalConIva: number): { base: number; iva: number } {
  const total = Number.isFinite(totalConIva) ? totalConIva : 0;
  const base = round2(total / (1 + IVA_RATE));
  return { base, iva: round2(total - base) };
}

export function splitAmount(amount: number | null | undefined): { entero: string; centavos: string } {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const [int, dec] = Math.abs(safe).toFixed(2).split('.');
  return {
    entero: `${safe < 0 ? '-' : ''}${Number(int).toLocaleString('en-US')}`,
    centavos: dec,
  };
}

export function discountPercent(reference: number | null | undefined, price: number): number {
  if (!reference || reference <= price) return 0;
  return Math.round(((reference - price) * 100) / reference);
}

export interface ShippingQuote {
  cost: number;
  free: boolean;
  freeFrom: number | null;
}

/** Replica SP_Pedidos_CrearPedido para mostrar el total; manda el servidor. */
export function quoteShipping(
  subtotalNetoDeDescuento: number,
  address: { CostoEnvio?: number | null; MontoMinimoEnvioGratis?: number | null } | null | undefined,
): ShippingQuote {
  const base = Number(address?.CostoEnvio ?? 0);
  const min = address?.MontoMinimoEnvioGratis != null ? Number(address.MontoMinimoEnvioGratis) : null;
  const free = min != null && subtotalNetoDeDescuento >= min;
  return { cost: free ? 0 : base, free, freeFrom: min };
}

export function orderNumber(idPedido: number | string): string {
  return `ORD-${String(idPedido).padStart(6, '0')}`;
}

export function amountToFreeShipping(subtotalNeto: number, minimoGratis: number | null | undefined): number {
  if (!minimoGratis || minimoGratis <= 0) return 0;
  return Math.max(0, round2(minimoGratis - subtotalNeto));
}
