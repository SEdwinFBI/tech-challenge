import { DomainError } from '@/core/domain/domain.error';

const PREFIJO_SUBIDAS = 'uploads/productos/';
const ABSOLUTA = /^https?:\/\//i;
const CLAVE_SUBIDA = /^uploads\/productos\/\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

export interface FuenteImagen {
  clave?: string;
  url?: string;
}

export interface ImagenAlmacenable {
  valor: string;
  clave: string | null;
}

const normalizarBase = (baseCdn?: string | null) => (baseCdn ?? '').replace(/\/+$/, '');

export const esUrlAbsoluta = (valor: string): boolean => ABSOLUTA.test(valor);

export const resolverUrlImagen = (valor: string | null | undefined, baseCdn?: string | null): string | null => {
  if (!valor) return null;
  if (esUrlAbsoluta(valor)) return valor;
  const base = normalizarBase(baseCdn);
  return base ? `${base}/${valor.replace(/^\/+/, '')}` : valor;
};

export const claveDesdeUrlCdn = (url: string, baseCdn?: string | null): string | null => {
  const base = normalizarBase(baseCdn);
  if (!base) return null;
  const prefijo = `${base}/`;
  if (!url.startsWith(prefijo)) return null;
  return url.slice(prefijo.length).split(/[?#]/)[0] || null;
};

export const esClaveSubidaProducto = (clave: string, idProducto: number): boolean =>
  CLAVE_SUBIDA.test(clave) && clave.startsWith(`${PREFIJO_SUBIDAS}${idProducto}/`);

export const claveParaEliminar = (valor: string | null | undefined, baseCdn?: string | null): string | null => {
  if (!valor) return null;
  const clave = esUrlAbsoluta(valor) ? claveDesdeUrlCdn(valor, baseCdn) : valor;
  return clave && clave.startsWith(PREFIJO_SUBIDAS) && !clave.includes('..') ? clave : null;
};

const claveInvalida = () =>
  new DomainError('La clave de la imagen no corresponde a este producto.', 'IMAGEN_CLAVE_INVALIDA', 400);

export const prepararImagenProducto = (
  fuente: FuenteImagen,
  idProducto: number,
  baseCdn?: string | null,
): ImagenAlmacenable => {
  if (Boolean(fuente.clave) === Boolean(fuente.url)) {
    throw new DomainError('Envía exactamente una de clave o url.', 'IMAGEN_FUENTE_INVALIDA', 400);
  }

  const clave = fuente.clave ?? claveDesdeUrlCdn(fuente.url!, baseCdn);
  if (clave === null) return { valor: fuente.url!, clave: null };
  if (!esClaveSubidaProducto(clave, idProducto)) throw claveInvalida();
  return { valor: clave, clave };
};
