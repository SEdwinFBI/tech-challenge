import { env } from '@/core/config/env';
import { DomainError } from '@/core/domain/domain.error';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { IProductImageService } from '../abstracts/product-image.service.interface';
import { ImageOwner, ImageSource, keyToDelete, prepareImage } from '../domain/stored-image.policy';
import { S3ImageStorage } from './s3-image.storage';

export class ProductImageService implements IProductImageService {
  constructor(private readonly storage: IImageStorage = new S3ImageStorage()) {}

  async prepare(source: ImageSource, owner: ImageOwner): Promise<string> {
    const image = prepareImage(source, owner, env.CDN_BASE_URL);
    if (image.clave === null) return image.valor;

    if (!this.storage.disponible()) {
      throw new DomainError('El almacenamiento de imágenes no está configurado.', 'ALMACENAMIENTO_NO_CONFIGURADO', 503);
    }
    if (!(await this.storage.existe(image.clave))) {
      throw new DomainError('La imagen no existe en el almacenamiento. Súbela antes de registrarla.', 'IMAGEN_NO_SUBIDA', 409);
    }
    return image.valor;
  }

  async release(previous: Array<string | null | undefined>, keep?: string | null): Promise<void> {
    const current = keyToDelete(keep, env.CDN_BASE_URL);
    const keys = new Set<string>();
    for (const value of previous) {
      const key = keyToDelete(value, env.CDN_BASE_URL);
      if (key && key !== current) keys.add(key);
    }
    for (const key of keys) {
      try {
        await this.storage.eliminar(key);
      } catch (err) {
        console.error('No se pudo eliminar la imagen del almacenamiento:', err);
      }
    }
  }
}
