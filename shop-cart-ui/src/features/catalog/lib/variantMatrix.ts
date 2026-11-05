import type { Variant } from '@/shared/types/domain';

export type VariantAttr = 'Talla' | 'Color' | 'Presentacion';
export type VariantSelection = Partial<Record<VariantAttr, string>>;

export const ATTR_LABEL: Record<VariantAttr, string> = {
  Talla: 'Talla',
  Color: 'Color',
  Presentacion: 'Presentación',
};

const ALL_ATTRS: VariantAttr[] = ['Talla', 'Color', 'Presentacion'];

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const valueOf = (v: Variant, attr: VariantAttr): string => clean(v[attr]);
const sellable = (v: Variant): boolean => v.Activo && v.ExistenciaDisponible > 0;

export function attributesOf(variants: Variant[]): VariantAttr[] {
  return ALL_ATTRS.filter(a => variants.some(v => valueOf(v, a) !== ''));
}

export function valuesOf(variants: Variant[], attr: VariantAttr): string[] {
  const seen = new Set<string>();
  variants.forEach(v => {
    const val = valueOf(v, attr);
    if (val) seen.add(val);
  });
  return [...seen];
}

function matches(v: Variant, selection: VariantSelection, skip?: VariantAttr): boolean {
  return ALL_ATTRS.every(a => a === skip || !selection[a] || valueOf(v, a) === selection[a]);
}

export function findVariant(variants: Variant[], selection: VariantSelection): Variant | undefined {
  return variants.find(v => matches(v, selection));
}

export function isOptionAvailable(
  variants: Variant[],
  attr: VariantAttr,
  value: string,
  selection: VariantSelection,
): boolean {
  return variants.some(v => sellable(v) && valueOf(v, attr) === value && matches(v, selection, attr));
}

export function initialSelection(variants: Variant[]): VariantSelection {
  const base = variants.find(sellable) ?? variants[0];
  if (!base) return {};
  const sel: VariantSelection = {};
  ALL_ATTRS.forEach(a => {
    const val = valueOf(base, a);
    if (val) sel[a] = val;
  });
  return sel;
}

export function selectValue(
  variants: Variant[],
  current: VariantSelection,
  attr: VariantAttr,
  value: string,
): VariantSelection {
  const next: VariantSelection = { ...current, [attr]: value };
  if (findVariant(variants, next)) return next;
  const candidate =
    variants.find(v => sellable(v) && valueOf(v, attr) === value) ?? variants.find(v => valueOf(v, attr) === value);
  if (!candidate) return next;
  const snapped: VariantSelection = {};
  ALL_ATTRS.forEach(a => {
    const val = valueOf(candidate, a);
    if (val) snapped[a] = val;
  });
  return snapped;
}
