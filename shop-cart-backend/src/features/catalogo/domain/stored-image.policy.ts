import { DomainError } from '@/core/domain/domain.error';

const PREFIJO_SUBIDAS = 'uploads/productos/';
const ABSOLUTA = /^https?:\/\//i;
const CLAVE_SUBIDA = /^uploads\/productos\/\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

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

export const isProductUploadKey = (clave: string, idProducto: number): boolean =>
  CLAVE_SUBIDA.test(clave) && clave.startsWith(`${PREFIJO_SUBIDAS}${idProducto}/`);

export const keyToDelete = (valor: string | null | undefined, baseCdn?: string | null): string | null => {
  if (!valor) return null;
  const clave = isAbsoluteUrl(valor) ? keyFromCdnUrl(valor, baseCdn) : valor;
  return clave && clave.startsWith(PREFIJO_SUBIDAS) && !clave.includes('..') ? clave : null;
};

const claveInvalida = () =>
  new DomainError('La clave de la imagen no corresponde a este producto.', 'IMAGEN_CLAVE_INVALIDA', 400);

export const prepareProductImage = (
  fuente: ImageSource,
  idProducto: number,
  baseCdn?: string | null,
): StorableImage => {
  if (Boolean(fuente.clave) === Boolean(fuente.url)) {
    throw new DomainError('Envía exactamente una de clave o url.', 'IMAGEN_FUENTE_INVALIDA', 400);
  }

  const clave = fuente.clave ?? keyFromCdnUrl(fuente.url!, baseCdn);
  if (clave === null) return { valor: fuente.url!, clave: null };
  if (!isProductUploadKey(clave, idProducto)) throw claveInvalida();
  return { valor: clave, clave };
};
