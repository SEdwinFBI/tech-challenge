import { env } from '@/core/config/env';
import { DomainError } from '@/core/domain/domain.error';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { FuenteImagen, prepararImagenProducto } from '../domain/imagen-almacenada';

export async function prepararImagenAlmacenada(
  fuente: FuenteImagen,
  idProducto: number,
  storage: IImageStorage,
): Promise<string> {
  const imagen = prepararImagenProducto(fuente, idProducto, env.CDN_BASE_URL);
  if (imagen.clave === null) return imagen.valor;

  if (!storage.disponible()) {
    throw new DomainError('El almacenamiento de imágenes no está configurado.', 'ALMACENAMIENTO_NO_CONFIGURADO', 503);
  }
  if (!(await storage.existe(imagen.clave))) {
    throw new DomainError('La imagen no existe en el almacenamiento. Súbela antes de registrarla.', 'IMAGEN_NO_SUBIDA', 409);
  }
  return imagen.valor;
}
