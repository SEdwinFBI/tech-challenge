import { DomainError } from '@/core/domain/domain.error';

export type ImageKind = 'productos' | 'categorias';

export interface ImageOwner {
  tipo: ImageKind;
  id: number;
}

const ABSOLUTA = /^https?:\/\//i;
const PREFIJO_SUBIDAS = /^uploads\/(productos|categorias)\//;
const CLAVE_SUBIDA = /^uploads\/(productos|categorias)\/\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

export interface ImageSource {
  clave?: string;
  url?: string;
}

export interface StorableImage {
  valor: string;
  clave: string | null;
}

const normalizarBase = (baseCdn?: string | null) => (baseCdn ?? '').replace(/\/+$/, '');

export const isAbsoluteUrl = (valor: string): boolean => ABSOLUTA.test(valor);

export const resolveImageUrl = (valor: string | null | undefined, baseCdn?: string | null): string | null => {
  if (!valor) return null;
  if (isAbsoluteUrl(valor)) return valor;
  const base = normalizarBase(baseCdn);
  return base ? `${base}/${valor.replace(/^\/+/, '')}` : valor;
};

export const keyFromCdnUrl = (url: string, baseCdn?: string | null): string | null => {
  const base = normalizarBase(baseCdn);
  if (!base) return null;
  const prefijo = `${base}/`;
  if (!url.startsWith(prefijo)) return null;
  return url.slice(prefijo.length).split(/[?#]/)[0] || null;
};

export const uploadKeyPrefix = (owner: ImageOwner): string => `uploads/${owner.tipo}/${owner.id}/`;

export const isUploadKey = (clave: string, owner: ImageOwner): boolean =>
  CLAVE_SUBIDA.test(clave) && clave.startsWith(uploadKeyPrefix(owner));

export const isProductUploadKey = (clave: string, idProducto: number): boolean =>
  isUploadKey(clave, { tipo: 'productos', id: idProducto });

export const keyToDelete = (valor: string | null | undefined, baseCdn?: string | null): string | null => {
  if (!valor) return null;
  const clave = isAbsoluteUrl(valor) ? keyFromCdnUrl(valor, baseCdn) : valor;
  return clave && PREFIJO_SUBIDAS.test(clave) && !clave.includes('..') ? clave : null;
};

const claveInvalida = (owner: ImageOwner) =>
  new DomainError(
    `La clave de la imagen no corresponde a ${owner.tipo === 'productos' ? 'este producto' : 'esta categoría'}.`,
    'IMAGEN_CLAVE_INVALIDA',
    400,
  );

export const prepareImage = (
  fuente: ImageSource,
  owner: ImageOwner,
  baseCdn?: string | null,
): StorableImage => {
  if (Boolean(fuente.clave) === Boolean(fuente.url)) {
    throw new DomainError('Envía exactamente una de clave o url.', 'IMAGEN_FUENTE_INVALIDA', 400);
  }

  const clave = fuente.clave ?? keyFromCdnUrl(fuente.url!, baseCdn);
  if (clave === null) return { valor: fuente.url!, clave: null };
  if (!isUploadKey(clave, owner)) throw claveInvalida(owner);
  return { valor: clave, clave };
};

export const prepareProductImage = (fuente: ImageSource, idProducto: number, baseCdn?: string | null): StorableImage =>
  prepareImage(fuente, { tipo: 'productos', id: idProducto }, baseCdn);
