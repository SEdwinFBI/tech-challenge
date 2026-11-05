import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/core/config/env';
import { IImageStorage, UrlSubidaImagen } from '../abstracts/image-storage.interface';

const EXTENSIONES: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const EXPIRA_SEGUNDOS = 300;

export class S3ImageStorage implements IImageStorage {
  private cliente: S3Client | null = null;

  disponible(): boolean {
    return Boolean(env.S3_BUCKET && env.S3_REGION && env.CDN_BASE_URL);
  }

  async crearUrlSubida(idProducto: number, contentType: string, tamanoBytes: number): Promise<UrlSubidaImagen> {
    const extension = EXTENSIONES[contentType];
    if (!extension) throw new Error(`Tipo de contenido no soportado: ${contentType}`);

    const clave = `productos/${idProducto}/${randomUUID()}.${extension}`;
    const comando = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: clave,
      ContentType: contentType,
      ContentLength: tamanoBytes,
      CacheControl: CACHE_CONTROL,
    });
    const urlSubida = await getSignedUrl(this.obtenerCliente(), comando, {
      expiresIn: EXPIRA_SEGUNDOS,
      signableHeaders: new Set(['content-type', 'content-length', 'cache-control']),
    });

    return {
      urlSubida,
      urlPublica: `${this.baseCdn()}/${clave}`,
      clave,
      expiraEn: new Date(Date.now() + EXPIRA_SEGUNDOS * 1000).toISOString(),
      cabeceras: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
    };
  }

  async eliminar(urlPublica: string): Promise<void> {
    if (!this.disponible()) return;
    const prefijo = `${this.baseCdn()}/`;
    if (!urlPublica.startsWith(prefijo)) return;
    const clave = urlPublica.slice(prefijo.length).split(/[?#]/)[0];
    if (!clave) return;
    try {
      await this.obtenerCliente().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: clave }));
    } catch (err) {
      console.error('No se pudo eliminar la imagen del almacenamiento:', err);
    }
  }

  private baseCdn(): string {
    return (env.CDN_BASE_URL ?? '').replace(/\/+$/, '');
  }

  private obtenerCliente(): S3Client {
    this.cliente ??= new S3Client({ region: env.S3_REGION });
    return this.cliente;
  }
}
