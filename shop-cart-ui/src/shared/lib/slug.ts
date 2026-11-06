const MAX_SLUG = 60;

export function slugify(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= MAX_SLUG) return base;
  const cut = base.slice(0, MAX_SLUG + 1);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 0 ? cut.slice(0, lastDash) : base.slice(0, MAX_SLUG)).replace(/-+$/g, '');
}

export function productParam(id: number, nombre: string): string {
  const slug = slugify(nombre);
  return slug ? `${id}-${slug}` : String(id);
}

export function productPath(id: number, nombre: string): string {
  return `/producto/${productParam(id, nombre)}`;
}

export function parseProductParam(param: string | undefined): number | null {
  const match = /^(\d+)(?:-|$)/.exec(param ?? '');
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
