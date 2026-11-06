import { env } from '@/core/config/env';
import { IImageStorage } from '../abstracts/image-storage.interface';
import { claveParaEliminar } from '../domain/imagen-almacenada';

export async function liberarImagenes(
  storage: IImageStorage,
  anteriores: Array<string | null | undefined>,
  conservar?: string | null,
): Promise<void> {
  const vigente = claveParaEliminar(conservar, env.CDN_BASE_URL);
  const claves = new Set<string>();
  for (const valor of anteriores) {
    const clave = claveParaEliminar(valor, env.CDN_BASE_URL);
    if (clave && clave !== vigente) claves.add(clave);
  }
  for (const clave of claves) {
    try {
      await storage.eliminar(clave);
    } catch (err) {
      console.error('No se pudo eliminar la imagen del almacenamiento:', err);
    }
  }
}
