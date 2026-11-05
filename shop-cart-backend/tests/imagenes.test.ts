import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DomainError } from '@/core/domain/domain.error';
import { ICatalogRepository } from '@/features/catalogo/abstracts/catalogo.repository.interface';
import { IImageStorage } from '@/features/catalogo/abstracts/image-storage.interface';
import { CreateImageUploadUrlCommandHandler } from '@/features/catalogo/commands/create-image-upload-url.command';
import { DeleteProductImageCommandHandler } from '@/features/catalogo/commands/delete-product-image.command';
import { CreateImageUploadUrlSchema } from '@/features/catalogo/models/catalogo.schema';
import { ProductDetailResult } from '@/features/catalogo/models/catalogo.model';
import { FakePublisher } from './fakes';

const repoCon = (parcial: Partial<ICatalogRepository>) => parcial as ICatalogRepository;
const conProducto = { producto: { IDProducto: 4 }, variantes: [] } as unknown as ProductDetailResult;
const sinProducto: ProductDetailResult = { producto: null, variantes: [] };

class FakeStorage implements IImageStorage {
  eliminadas: string[] = [];
  firmadas: Array<[number, string, number]> = [];
  constructor(private readonly activo: boolean) {}
  disponible() {
    return this.activo;
  }
  async crearUrlSubida(id: number, tipo: string, tam: number) {
    this.firmadas.push([id, tipo, tam]);
    return {
      urlSubida: 'https://bucket.s3/firmada',
      urlPublica: 'https://cdn.example/productos/4/x.webp',
      clave: 'productos/4/x.webp',
      expiraEn: new Date().toISOString(),
      cabeceras: { 'Content-Type': tipo },
    };
  }
  async eliminar(url: string) {
    this.eliminadas.push(url);
  }
}

describe('CreateImageUploadUrlSchema', () => {
  it('acepta tipos y tamaños válidos', () => {
    assert.equal(CreateImageUploadUrlSchema.safeParse({ contentType: 'image/webp', tamanoBytes: 1 }).success, true);
    assert.equal(CreateImageUploadUrlSchema.safeParse({ contentType: 'image/png', tamanoBytes: 2_097_152 }).success, true);
  });

  it('rechaza tipos no permitidos, tamaño cero, excesivo o decimal', () => {
    assert.equal(CreateImageUploadUrlSchema.safeParse({ contentType: 'image/gif', tamanoBytes: 10 }).success, false);
    assert.equal(CreateImageUploadUrlSchema.safeParse({ contentType: 'image/png', tamanoBytes: 0 }).success, false);
    assert.equal(CreateImageUploadUrlSchema.safeParse({ contentType: 'image/png', tamanoBytes: 2_097_153 }).success, false);
    assert.equal(CreateImageUploadUrlSchema.safeParse({ contentType: 'image/png', tamanoBytes: 10.5 }).success, false);
    assert.equal(CreateImageUploadUrlSchema.safeParse({ tamanoBytes: 10 }).success, false);
  });
});

describe('CreateImageUploadUrlCommandHandler', () => {
  const cmd = { idProducto: 4, contentType: 'image/webp' as const, tamanoBytes: 5000 };

  it('responde 404 si el producto no existe', async () => {
    const handler = new CreateImageUploadUrlCommandHandler(
      repoCon({ getProductByIdAdmin: async () => sinProducto }),
      new FakeStorage(true),
    );
    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.httpStatus === 404 && err.code === 'PRODUCT_NOT_FOUND',
    );
  });

  it('responde 503 ALMACENAMIENTO_NO_CONFIGURADO si no hay almacenamiento', async () => {
    const storage = new FakeStorage(false);
    const handler = new CreateImageUploadUrlCommandHandler(repoCon({ getProductByIdAdmin: async () => conProducto }), storage);
    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.httpStatus === 503 && err.code === 'ALMACENAMIENTO_NO_CONFIGURADO',
    );
    assert.equal(storage.firmadas.length, 0);
  });

  it('devuelve la URL firmada cuando todo está disponible', async () => {
    const storage = new FakeStorage(true);
    const handler = new CreateImageUploadUrlCommandHandler(repoCon({ getProductByIdAdmin: async () => conProducto }), storage);
    const res = await handler.handle(cmd);
    assert.equal(res.urlSubida, 'https://bucket.s3/firmada');
    assert.deepEqual(storage.firmadas, [[4, 'image/webp', 5000]]);
  });
});

describe('DeleteProductImageCommandHandler', () => {
  it('elimina el objeto del almacenamiento con la URL devuelta por el repositorio y publica el evento', async () => {
    const storage = new FakeStorage(true);
    const events = new FakePublisher();
    const handler = new DeleteProductImageCommandHandler(
      repoCon({ deleteProductImage: async () => 'https://cdn.example/productos/4/x.webp' }),
      storage,
      events,
    );
    await handler.handle({ idProductoImagen: 3, idAdmin: 1 });
    assert.deepEqual(storage.eliminadas, ['https://cdn.example/productos/4/x.webp']);
    assert.equal(events.eventos[0]!.tipo, 'CATALOGO_ACTUALIZADO');
  });

  it('no toca el almacenamiento si no hay URL', async () => {
    const storage = new FakeStorage(true);
    const handler = new DeleteProductImageCommandHandler(
      repoCon({ deleteProductImage: async () => null }),
      storage,
      new FakePublisher(),
    );
    await handler.handle({ idProductoImagen: 3, idAdmin: 1 });
    assert.deepEqual(storage.eliminadas, []);
  });
});
