import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { env } from '@/core/config/env';
import { DomainError } from '@/core/domain/domain.error';
import { ICatalogRepository } from '@/features/catalogo/abstracts/catalogo.repository.interface';
import { IImageStorage } from '@/features/catalogo/abstracts/image-storage.interface';
import { CreateImageUploadUrlCommandHandler } from '@/features/catalogo/commands/create-image-upload-url.command';
import { DeleteProductCommandHandler } from '@/features/catalogo/commands/delete-product.command';
import { UpdateProductCommandHandler } from '@/features/catalogo/commands/update-product.command';
import { DeleteProductImageCommandHandler } from '@/features/catalogo/commands/delete-product-image.command';
import { AddProductImageCommandHandler } from '@/features/catalogo/commands/add-product-image.command';
import {
  claveDesdeUrlCdn,
  claveParaEliminar,
  esClaveSubidaProducto,
  prepararImagenProducto,
  resolverUrlImagen,
} from '@/features/catalogo/domain/imagen-almacenada';
import {
  AddProductImageSchema,
  CreateImageUploadUrlSchema,
  UpdateProductSchema,
} from '@/features/catalogo/models/catalogo.schema';
import { ProductDetailResult } from '@/features/catalogo/models/catalogo.model';
import { FakePublisher } from './fakes';

const repoCon = (parcial: Partial<ICatalogRepository>) => parcial as ICatalogRepository;
const conProducto = { producto: { IDProducto: 4 }, variantes: [] } as unknown as ProductDetailResult;
const sinProducto: ProductDetailResult = { producto: null, variantes: [] };

class FakeStorage implements IImageStorage {
  eliminadas: string[] = [];
  consultadas: string[] = [];
  objetoExiste = true;
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
  async existe(clave: string) {
    this.consultadas.push(clave);
    return this.objetoExiste;
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

const CDN = 'https://cdn.example.com';
const UUID = '3f2b8c1e-9a47-4d6e-b1a2-5c7d8e9f0a1b';
const CLAVE_10 = `uploads/productos/10/${UUID}.webp`;

describe('resolverUrlImagen', () => {
  it('deja intacta una URL absoluta', () => {
    assert.equal(resolverUrlImagen('https://images.unsplash.com/a.jpg', CDN), 'https://images.unsplash.com/a.jpg');
    assert.equal(resolverUrlImagen('http://x.test/a.png', CDN), 'http://x.test/a.png');
  });

  it('antepone el CDN a una clave y tolera barras sobrantes', () => {
    assert.equal(resolverUrlImagen(CLAVE_10, CDN), `${CDN}/${CLAVE_10}`);
    assert.equal(resolverUrlImagen(CLAVE_10, `${CDN}/`), `${CDN}/${CLAVE_10}`);
  });

  it('devuelve null para valores vacíos', () => {
    assert.equal(resolverUrlImagen(null, CDN), null);
    assert.equal(resolverUrlImagen(undefined, CDN), null);
    assert.equal(resolverUrlImagen('', CDN), null);
  });
});

describe('esClaveSubidaProducto', () => {
  it('acepta la clave del propio producto', () => {
    assert.equal(esClaveSubidaProducto(CLAVE_10, 10), true);
    assert.equal(esClaveSubidaProducto(`uploads/productos/10/${UUID}.jpg`, 10), true);
    assert.equal(esClaveSubidaProducto(`uploads/productos/10/${UUID}.png`, 10), true);
  });

  it('rechaza la clave de otro producto, incluso con prefijo numérico común', () => {
    assert.equal(esClaveSubidaProducto(CLAVE_10, 11), false);
    assert.equal(esClaveSubidaProducto(CLAVE_10, 1), false);
    assert.equal(esClaveSubidaProducto(`uploads/productos/100/${UUID}.webp`, 10), false);
  });

  it('rechaza path traversal, otros prefijos y extensiones', () => {
    assert.equal(esClaveSubidaProducto('uploads/productos/10/../11/x.webp', 10), false);
    assert.equal(esClaveSubidaProducto(`uploads/productos/10/../11/${UUID}.webp`, 10), false);
    assert.equal(esClaveSubidaProducto(`uploads/productos/10/../../secretos/${UUID}.webp`, 10), false);
    assert.equal(esClaveSubidaProducto(`otros/productos/10/${UUID}.webp`, 10), false);
    assert.equal(esClaveSubidaProducto(`/uploads/productos/10/${UUID}.webp`, 10), false);
    assert.equal(esClaveSubidaProducto(`uploads/productos/10/${UUID}.gif`, 10), false);
    assert.equal(esClaveSubidaProducto(`uploads/productos/10/${UUID}.webp?x=1`, 10), false);
  });
});

describe('claveDesdeUrlCdn', () => {
  it('convierte una URL del CDN en su clave sin query ni hash', () => {
    assert.equal(claveDesdeUrlCdn(`${CDN}/${CLAVE_10}`, CDN), CLAVE_10);
    assert.equal(claveDesdeUrlCdn(`${CDN}/${CLAVE_10}?v=2#x`, `${CDN}/`), CLAVE_10);
  });

  it('devuelve null para URLs ajenas o sin CDN configurado', () => {
    assert.equal(claveDesdeUrlCdn('https://images.unsplash.com/a.jpg', CDN), null);
    assert.equal(claveDesdeUrlCdn(`${CDN}/${CLAVE_10}`, undefined), null);
  });
});

describe('prepararImagenProducto', () => {
  it('guarda la clave propia tal cual', () => {
    assert.deepEqual(prepararImagenProducto({ clave: CLAVE_10 }, 10, CDN), { valor: CLAVE_10, clave: CLAVE_10 });
  });

  it('convierte una URL del CDN en su clave (compatibilidad)', () => {
    assert.deepEqual(prepararImagenProducto({ url: `${CDN}/${CLAVE_10}` }, 10, CDN), { valor: CLAVE_10, clave: CLAVE_10 });
  });

  it('guarda una URL externa sin cambios', () => {
    const url = 'https://cdn.dummyjson.com/img/1.webp';
    assert.deepEqual(prepararImagenProducto({ url }, 10, CDN), { valor: url, clave: null });
  });

  it('rechaza con 400 IMAGEN_CLAVE_INVALIDA la clave de otro producto, también vía URL del CDN', () => {
    for (const fuente of [{ clave: CLAVE_10 }, { url: `${CDN}/${CLAVE_10}` }]) {
      assert.throws(
        () => prepararImagenProducto(fuente, 11, CDN),
        (err: unknown) => err instanceof DomainError && err.httpStatus === 400 && err.code === 'IMAGEN_CLAVE_INVALIDA',
      );
    }
    assert.throws(
      () => prepararImagenProducto({ clave: 'uploads/productos/10/../11/x.webp' }, 10, CDN),
      (err: unknown) => err instanceof DomainError && err.code === 'IMAGEN_CLAVE_INVALIDA',
    );
  });

  it('exige exactamente una fuente', () => {
    for (const fuente of [{}, { clave: CLAVE_10, url: 'https://a.test/x.png' }]) {
      assert.throws(
        () => prepararImagenProducto(fuente, 10, CDN),
        (err: unknown) => err instanceof DomainError && err.code === 'IMAGEN_FUENTE_INVALIDA',
      );
    }
  });
});

describe('claveParaEliminar', () => {
  it('usa la clave almacenada', () => {
    assert.equal(claveParaEliminar(CLAVE_10, CDN), CLAVE_10);
  });

  it('convierte una URL del CDN en su clave', () => {
    assert.equal(claveParaEliminar(`${CDN}/${CLAVE_10}?v=1`, CDN), CLAVE_10);
  });

  it('ignora URLs externas, vacíos y claves fuera de uploads/productos/', () => {
    assert.equal(claveParaEliminar('https://images.unsplash.com/a.jpg', CDN), null);
    assert.equal(claveParaEliminar(null, CDN), null);
    assert.equal(claveParaEliminar('otros/archivo.webp', CDN), null);
    assert.equal(claveParaEliminar('uploads/productos/../secreto', CDN), null);
  });
});

describe('AddProductImageSchema', () => {
  it('acepta exactamente uno de clave o url', () => {
    assert.equal(AddProductImageSchema.safeParse({ clave: CLAVE_10 }).success, true);
    assert.equal(AddProductImageSchema.safeParse({ url: 'https://a.test/x.png' }).success, true);
  });

  it('rechaza ninguno, ambos o URL no http(s)', () => {
    assert.equal(AddProductImageSchema.safeParse({}).success, false);
    assert.equal(AddProductImageSchema.safeParse({ clave: CLAVE_10, url: 'https://a.test/x.png' }).success, false);
    assert.equal(AddProductImageSchema.safeParse({ url: 'ftp://a.test/x.png' }).success, false);
    assert.equal(AddProductImageSchema.safeParse({ clave: '' }).success, false);
  });
});

describe('UpdateProductSchema', () => {
  it('permite portada por clave o por URL pero no ambas', () => {
    assert.equal(UpdateProductSchema.safeParse({ imagenClave: CLAVE_10 }).success, true);
    assert.equal(UpdateProductSchema.safeParse({ imagenUrl: 'https://a.test/x.png' }).success, true);
    assert.equal(UpdateProductSchema.safeParse({ nombre: 'Camisa' }).success, true);
    assert.equal(UpdateProductSchema.safeParse({ imagenClave: CLAVE_10, imagenUrl: 'https://a.test/x.png' }).success, false);
  });
});

describe('AddProductImageCommandHandler', () => {
  const imagen = { IDProductoImagen: 1, IDProducto: 10, Url: 'x', Orden: 1 };

  it('verifica el objeto y guarda la clave', async () => {
    const guardados: string[] = [];
    const storage = new FakeStorage(true);
    const handler = new AddProductImageCommandHandler(
      repoCon({ addProductImage: async (_id, valor) => (guardados.push(valor), imagen) }),
      new FakePublisher(),
      storage,
    );
    await handler.handle({ idProducto: 10, clave: CLAVE_10, idAdmin: 1 });
    assert.deepEqual(guardados, [CLAVE_10]);
    assert.deepEqual(storage.consultadas, [CLAVE_10]);
  });

  it('responde 409 IMAGEN_NO_SUBIDA si el objeto no existe y no guarda nada', async () => {
    const storage = new FakeStorage(true);
    storage.objetoExiste = false;
    let guardado = false;
    const handler = new AddProductImageCommandHandler(
      repoCon({ addProductImage: async () => ((guardado = true), imagen) }),
      new FakePublisher(),
      storage,
    );
    await assert.rejects(
      () => handler.handle({ idProducto: 10, clave: CLAVE_10, idAdmin: 1 }),
      (err: unknown) => err instanceof DomainError && err.httpStatus === 409 && err.code === 'IMAGEN_NO_SUBIDA',
    );
    assert.equal(guardado, false);
  });

  it('responde 400 con la clave de otro producto sin consultar el almacenamiento', async () => {
    const storage = new FakeStorage(true);
    const handler = new AddProductImageCommandHandler(repoCon({}), new FakePublisher(), storage);
    await assert.rejects(
      () => handler.handle({ idProducto: 11, clave: CLAVE_10, idAdmin: 1 }),
      (err: unknown) => err instanceof DomainError && err.httpStatus === 400 && err.code === 'IMAGEN_CLAVE_INVALIDA',
    );
    assert.deepEqual(storage.consultadas, []);
  });

  it('guarda una URL externa tal cual sin consultar el almacenamiento', async () => {
    const guardados: string[] = [];
    const storage = new FakeStorage(true);
    const handler = new AddProductImageCommandHandler(
      repoCon({ addProductImage: async (_id, valor) => (guardados.push(valor), imagen) }),
      new FakePublisher(),
      storage,
    );
    await handler.handle({ idProducto: 10, url: 'https://images.unsplash.com/a.jpg', idAdmin: 1 });
    assert.deepEqual(guardados, ['https://images.unsplash.com/a.jpg']);
    assert.deepEqual(storage.consultadas, []);
  });
});

describe('limpieza de portadas y galería en el almacenamiento', () => {
  const base = env.CDN_BASE_URL!.replace(/\/+$/, '');
  const claveA = `uploads/productos/10/${UUID}.webp`;
  const claveB = 'uploads/productos/10/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb.webp';
  const detalle = (portada: string | null, galeria: string[] = []) =>
    ({
      producto: { IDProducto: 10, ImagenUrl: portada },
      variantes: [],
      imagenes: galeria.map((Url, i) => ({ IDProductoImagen: i + 1, IDProducto: 10, Url, Orden: i + 1 })),
    }) as unknown as ProductDetailResult;

  const actualizar = async (anterior: string | null, cmd: Record<string, unknown>, storage = new FakeStorage(true)) => {
    const handler = new UpdateProductCommandHandler(
      repoCon({ getProductByIdAdmin: async () => detalle(anterior), updateProduct: async () => ({ IDProducto: 10 }) }),
      new FakePublisher(),
      storage,
    );
    await handler.handle({ idProducto: 10, idAdmin: 1, ...cmd });
    return storage;
  };

  it('elimina la portada anterior propia al reemplazarla por otra clave', async () => {
    const storage = await actualizar(`${base}/${claveA}`, { imagenClave: claveB });
    assert.deepEqual(storage.eliminadas, [claveA]);
  });

  it('elimina la portada anterior al reemplazarla por una URL externa', async () => {
    const storage = await actualizar(`${base}/${claveA}`, { imagenUrl: 'https://images.unsplash.com/a.jpg' });
    assert.deepEqual(storage.eliminadas, [claveA]);
  });

  it('no elimina nada si la anterior era externa, nula o igual a la nueva', async () => {
    assert.deepEqual((await actualizar('https://images.unsplash.com/a.jpg', { imagenClave: claveB })).eliminadas, []);
    assert.deepEqual((await actualizar(null, { imagenClave: claveB })).eliminadas, []);
    assert.deepEqual((await actualizar(`${base}/${claveB}`, { imagenClave: claveB })).eliminadas, []);
  });

  it('no toca el almacenamiento si no cambia la portada', async () => {
    const storage = await actualizar(`${base}/${claveA}`, { nombre: 'Camisa nueva' });
    assert.deepEqual(storage.eliminadas, []);
  });

  it('un fallo al eliminar no rompe la actualización', async () => {
    const storage = new FakeStorage(true);
    storage.eliminar = async () => {
      throw new Error('S3 caído');
    };
    await assert.doesNotReject(() => actualizar(`${base}/${claveA}`, { imagenClave: claveB }, storage));
  });

  it('no elimina nada si la actualización falla', async () => {
    const storage = new FakeStorage(true);
    const handler = new UpdateProductCommandHandler(
      repoCon({
        getProductByIdAdmin: async () => detalle(`${base}/${claveA}`),
        updateProduct: async () => {
          throw new Error('SQL');
        },
      }),
      new FakePublisher(),
      storage,
    );
    await assert.rejects(() => handler.handle({ idProducto: 10, idAdmin: 1, imagenClave: claveB }));
    assert.deepEqual(storage.eliminadas, []);
  });

  it('al eliminar físicamente un producto borra portada y galería propias, sin las externas', async () => {
    const storage = new FakeStorage(true);
    const handler = new DeleteProductCommandHandler(
      repoCon({
        getProductByIdAdmin: async () =>
          detalle(`${base}/${claveA}`, [`${base}/${claveA}`, claveB, 'https://images.unsplash.com/a.jpg']),
        deleteOrDeactivateProduct: async () => ({ Resultado: 'ELIMINADO' }) as never,
      }),
      new FakePublisher(),
      storage,
    );
    await handler.handle({ idProducto: 10, idAdmin: 1 });
    assert.deepEqual(storage.eliminadas.sort(), [claveA, claveB].sort());
  });

  it('al solo desactivar un producto conserva las imágenes', async () => {
    const storage = new FakeStorage(true);
    const handler = new DeleteProductCommandHandler(
      repoCon({
        getProductByIdAdmin: async () => detalle(`${base}/${claveA}`),
        deleteOrDeactivateProduct: async () => ({ Resultado: 'DESACTIVADO' }) as never,
      }),
      new FakePublisher(),
      storage,
    );
    await handler.handle({ idProducto: 10, idAdmin: 1 });
    assert.deepEqual(storage.eliminadas, []);
  });
});
