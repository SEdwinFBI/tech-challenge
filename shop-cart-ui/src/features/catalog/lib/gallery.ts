import type { ProductImage } from '@/shared/types/domain';

const keyOf = (url: string): string => {
  const i = url.indexOf('uploads/');
  return (i >= 0 ? url.slice(i) : url).split('?')[0];
};

export function galleryImages(cover: string | null | undefined, gallery: ProductImage[] | undefined): string[] {
  const ordered = [...(gallery ?? [])].sort((a, b) => a.Orden - b.Orden).map(i => i.Url);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [cover, ...ordered]) {
    const url = raw?.trim();
    if (!url) continue;
    const key = keyOf(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}
