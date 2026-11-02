import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DomainError } from '@/core/domain/domain.error';
import {
  AddProductImageSchema,
  GetProductsSchema,
  SetFeaturedSchema,
  SetReferencePriceSchema,
} from '@/features/catalogo/models/catalogo.schema';
import { ICatalogRepository } from '@/features/catalogo/abstracts/catalogo.repository.interface';
import { GetProductsFilter, ProductDetailResult } from '@/features/catalogo/models/catalogo.model';
import { GetProductsQueryHandler } from '@/features/catalogo/queries/get-products.query';
import { GetProductImagesQueryHandler } from '@/features/catalogo/queries/get-product-images.query';
import { SetReferencePriceCommandHandler } from '@/features/catalogo/commands/set-reference-price.command';
import { AddFavoriteSchema } from '@/features/favoritos/models/favoritos.schema';
import { IFavoritesRepository } from '@/features/favoritos/abstracts/favoritos.repository.interface';
import { AddFavoriteCommandHandler } from '@/features/favoritos/commands/add-favorite.command';
import { RemoveFavoriteCommandHandler } from '@/features/favoritos/commands/remove-favorite.command';
import { GetFavoriteIdsQueryHandler } from '@/features/favoritos/queries/get-favorite-ids.query';
import bcrypt from 'bcryptjs';
import { SetCategoryImageSchema } from '@/features/catalogo/models/catalogo.schema';
import { ChangePasswordSchema, UpdateProfileSchema } from '@/features/auth/models/auth.schema';
import { IAuthRepository } from '@/features/auth/abstracts/auth.repository.interface';
import { ChangePasswordCommandHandler } from '@/features/auth/commands/change-password.command';
import { UpdateProfileCommandHandler } from '@/features/auth/commands/update-profile.command';
import { GetLowStockSchema } from '@/features/inventario/models/existencias-bajas.model';
import { IInventoryRepository } from '@/features/inventario/abstracts/inventario.repository.interface';
import { GetLowStockQueryHandler } from '@/features/inventario/queries/get-low-stock.query';
import { GetProductAdminQueryHandler } from '@/features/catalogo/queries/get-product-admin.query';
import { GetProductInventoryQueryHandler } from '@/features/catalogo/queries/get-product-inventory.query';
import { resolveDashboardRange } from '@/features/dashboard/domain/dashboard-range';
import { GetDashboardSummarySchema, ExportDashboardExcelSchema } from '@/features/dashboard/models/dashboard.schema';
import { GetDashboardSummaryQueryHandler } from '@/features/dashboard/queries/get-dashboard-summary.query';
import { ExportDashboardExcelQueryHandler } from '@/features/dashboard/queries/export-dashboard-excel.query';
import { IDashboardRepository } from '@/features/dashboard/abstracts/dashboard.repository.interface';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/core/config/env';
import { globalErrorHandler } from '@/core/middlewares/error.middleware';
import { AuthRepository } from '@/features/auth/repository/auth.repository';
import { CatalogRepository } from '@/features/catalogo/repository/catalogo.repository';
import { catalogoRouter } from '@/features/catalogo/catalogo.routes';

function asCatalogRepo(partial: Partial<ICatalogRepository>): ICatalogRepository {
  return partial as unknown as ICatalogRepository;
}

describe('Consulta operativa de inventario', () => {
  const detail: ProductDetailResult = {
    producto: { IDProducto: 7, Nombre: 'Producto', IDCategoria: 1, Activo: false, Descripcion: 'Detalle administrativo' },
    variantes: [{ IDVariante: 10, SKU: 'SKU-10', Precio: 125, Activo: false, ExistenciaFisica: 8, UnidadesReservadas: 2, ExistenciaDisponible: 6 }],
    imagenes: [{ IDProductoImagen: 1, IDProducto: 7, Url: 'https://example.com/imagen.png', Orden: 1 }],
  };

  it('conserva las variantes inactivas y limita la respuesta a datos operativos', async () => {
    const handler = new GetProductInventoryQueryHandler(asCatalogRepo({ getProductByIdAdmin: async () => detail }));
    const result = await handler.handle(7);
    assert.deepEqual(result.producto, { IDProducto: 7, Nombre: 'Producto', Activo: false });
    assert.equal(result.variantes[0]?.ExistenciaDisponible, 6);
    assert.equal(result.variantes[0]?.Activo, false);
    assert.equal('Precio' in result.variantes[0]!, false);
    assert.equal('imagenes' in result, false);
  });

  it('responde 404 cuando no existe el producto', async () => {
    const handler = new GetProductInventoryQueryHandler(asCatalogRepo({ getProductByIdAdmin: async () => ({ producto: null, variantes: [] }) }));
    await assert.rejects(() => handler.handle(99), (error: unknown) => error instanceof DomainError && error.httpStatus === 404);
  });

  it('permite leer a operador y administrador, sin conceder al operador administración del catálogo', async t => {
    const roles = ['OPERADOR', 'ADMINISTRADOR', 'CLIENTE'] as const;
    t.mock.method(AuthRepository.prototype, 'getById', async (id: number) => ({
      IDUsuario: id, Correo: 'test@example.com', Rol: roles[id - 1], Activo: true,
    }));
    t.mock.method(CatalogRepository.prototype, 'getProductByIdAdmin', async () => detail);
    const app = express();
    app.use('/catalogo', catalogoRouter);
    app.use(globalErrorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(() => new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close(error => error ? reject(error) : resolve());
    }));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/catalogo`;
    assert.equal((await fetch(`${base}/productos/7/inventario`)).status, 401);
    for (const [index, role] of roles.entries()) {
      const token = jwt.sign({ idUsuario: index + 1, correo: 'test@example.com', rol: role }, env.JWT_ACCESS_SECRET);
      const headers = { authorization: `Bearer ${token}` };
      const response = await fetch(`${base}/productos/7/inventario`, { headers });
      assert.equal(response.status, role === 'CLIENTE' ? 403 : 200);
      if (role === 'OPERADOR') {
        assert.equal((await fetch(`${base}/admin/productos/7`, { headers })).status, 403);
        assert.equal((await fetch(`${base}/productos`, { method: 'POST', headers })).status, 403);
      }
    }
  });
});

describe('Periodos del dashboard', () => {
  const now = new Date('2026-11-02T02:30:00.000Z');

  it('calcula los cuatro periodos con el calendario de Guatemala', () => {
    const cases = { HOY: '2026-11-01T06:00:00.000Z', SEMANA: '2026-10-26T06:00:00.000Z', MES: '2026-11-01T06:00:00.000Z', ANIO: '2026-01-01T06:00:00.000Z' } as const;
    for (const [periodo, expected] of Object.entries(cases)) {
      const query = GetDashboardSummarySchema.parse({ periodo });
      const range = resolveDashboardRange(query, now);
      assert.equal(range.fechaInicio.toISOString(), expected, periodo);
      assert.equal(range.fechaFin.toISOString(), now.toISOString());
    }
  });

  it('respeta medianoche, inicio de semana y cambio de año en Guatemala', () => {
    assert.equal(resolveDashboardRange({ periodo: 'HOY' }, new Date('2027-01-01T05:59:59Z')).fechaInicio.toISOString(), '2026-12-31T06:00:00.000Z');
    assert.equal(resolveDashboardRange({ periodo: 'ANIO' }, new Date('2027-01-01T06:00:00Z')).fechaInicio.toISOString(), '2027-01-01T06:00:00.000Z');
    assert.equal(resolveDashboardRange({ periodo: 'SEMANA' }, new Date('2026-11-02T06:00:00Z')).fechaInicio.toISOString(), '2026-11-02T06:00:00.000Z');
  });

  it('conserva rangos explícitos y el rango predeterminado de treinta días', () => {
    const fechaInicio = new Date('2026-09-15T12:00:00Z');
    const range = resolveDashboardRange({ periodo: 'HOY', fechaInicio, fechaFin: now }, now);
    assert.equal(range.fechaInicio.toISOString(), fechaInicio.toISOString());
    assert.equal(range.fechaFin.toISOString(), now.toISOString());
    assert.equal(resolveDashboardRange({}, now).fechaInicio.getTime(), now.getTime() - 30 * 86400 * 1000);
  });

  it('rechaza periodos, fechas y rangos inválidos en resumen y Excel', () => {
    for (const schema of [GetDashboardSummarySchema, ExportDashboardExcelSchema]) {
      assert.equal(schema.safeParse({ periodo: 'AYER' }).success, false);
      assert.equal(schema.safeParse({ fechaInicio: 'no-es-fecha' }).success, false);
      assert.equal(schema.safeParse({ fechaInicio: '2026-12-01', fechaFin: '2026-11-01' }).success, false);
      assert.equal(schema.parse({ periodo: 'HOY' }).periodo, 'HOY');
    }
    assert.throws(() => resolveDashboardRange({ fechaInicio: new Date('2026-12-01') }, now), (error: unknown) => error instanceof DomainError && error.httpStatus === 400);
  });

  it('aplica el mismo rango al resumen, la serie temporal y la exportación', async () => {
    const ranges: string[][] = [];
    const repo = {
      getMetricsSummary: async (start: Date, end: Date) => {
        ranges.push([start.toISOString(), end.toISOString()]);
        return { kpis: {}, top10Productos: [], ventasPorCategoria: [] };
      },
      getSalesByPeriod: async (_group: string, start: Date, end: Date) => {
        ranges.push([start.toISOString(), end.toISOString()]);
        return [];
      },
    } as IDashboardRepository;
    const query = { periodo: 'HOY' as const, fechaFin: new Date('2026-11-09T19:20:21.123Z') };
    await new GetDashboardSummaryQueryHandler(repo).handle(query);
    await new ExportDashboardExcelQueryHandler(repo).handle(query);
    assert.equal(ranges.length, 3);
    for (const range of ranges) assert.deepEqual(range, ['2026-11-09T06:00:00.000Z', query.fechaFin.toISOString()]);
  });
});

describe('Extensiones de tienda: esquemas de catálogo', () => {
  it('acepta los nuevos criterios de orden y rechaza valores desconocidos', () => {
    assert.equal(GetProductsSchema.safeParse({ orden: 'MAS_VENDIDOS' }).success, true);
    assert.equal(GetProductsSchema.safeParse({ orden: 'DESTACADOS' }).success, true);
    assert.equal(GetProductsSchema.safeParse({ orden: 'RECIENTES' }).success, true);
    assert.equal(GetProductsSchema.safeParse({ orden: 'ALEATORIO' }).success, false);
  });

  it('mantiene los valores por defecto existentes del listado', () => {
    const parsed = GetProductsSchema.parse({});
    assert.equal(parsed.orden, 'RECIENTES');
    assert.equal(parsed.pagina, 1);
    assert.equal(parsed.tamanoPagina, 12);
  });

  it('solo admite imágenes con URL http(s)', () => {
    assert.equal(AddProductImageSchema.safeParse({ url: 'https://images.unsplash.com/photo-1?w=800' }).success, true);
    assert.equal(AddProductImageSchema.safeParse({ url: 'javascript:alert(1)' }).success, false);
    assert.equal(AddProductImageSchema.safeParse({ url: 'no-es-url' }).success, false);
    assert.equal(AddProductImageSchema.safeParse({}).success, false);
  });

  it('el precio de referencia admite null para quitarlo y rechaza cero o negativos', () => {
    assert.equal(SetReferencePriceSchema.safeParse({ precioReferencia: null }).success, true);
    assert.equal(SetReferencePriceSchema.safeParse({ precioReferencia: 199.5 }).success, true);
    assert.equal(SetReferencePriceSchema.safeParse({ precioReferencia: 0 }).success, false);
    assert.equal(SetReferencePriceSchema.safeParse({ precioReferencia: -5 }).success, false);
    assert.equal(SetReferencePriceSchema.safeParse({}).success, false);
  });

  it('destacado exige un booleano', () => {
    assert.equal(SetFeaturedSchema.safeParse({ destacado: true }).success, true);
    assert.equal(SetFeaturedSchema.safeParse({ destacado: 'si' }).success, false);
  });
});

describe('Extensiones de tienda: handlers de catálogo', () => {
  it('el listado traduce los filtros de texto a booleanos para el SP', async () => {
    let received: GetProductsFilter | undefined;
    const handler = new GetProductsQueryHandler(
      asCatalogRepo({
        getProducts: async f => {
          received = f;
          return { items: [], totalRegistros: 0 };
        },
      }),
    );
    await handler.handle({
      ...GetProductsSchema.parse({ soloOfertas: 'true', soloNuevos: 'false', orden: 'MAS_VENDIDOS' }),
      rolUsuario: undefined,
    });
    assert.equal(received?.soloOfertas, true);
    assert.equal(received?.soloNuevos, false);
    assert.equal(received?.soloDestacados, false);
    assert.equal(received?.orden, 'MAS_VENDIDOS');
    assert.equal(received?.incluirInactivos, false);
  });

  it('rechaza un precio de referencia no positivo antes de llegar a la base de datos', async () => {
    let llamado = false;
    const handler = new SetReferencePriceCommandHandler(
      asCatalogRepo({
        setReferencePrice: async () => {
          llamado = true;
        },
      }),
    );
    await assert.rejects(
      () => handler.handle({ idVariante: 1, precioReferencia: 0, idAdmin: 1 }),
      (err: unknown) => err instanceof DomainError && err.code === 'INVALID_REFERENCE_PRICE' && err.httpStatus === 400,
    );
    assert.equal(llamado, false);
  });

  it('permite quitar el precio de referencia con null y delega al repositorio', async () => {
    const llamadas: Array<number | null> = [];
    const handler = new SetReferencePriceCommandHandler(
      asCatalogRepo({
        setReferencePrice: async (_id, precio) => {
          llamadas.push(precio);
        },
      }),
    );
    await handler.handle({ idVariante: 1, precioReferencia: null, idAdmin: 1 });
    assert.deepEqual(llamadas, [null]);
  });

  it('la galería de un producto inexistente responde 404 y la de uno sin imágenes responde vacía', async () => {
    const sinProducto: ProductDetailResult = { producto: null, variantes: [] };
    const handler404 = new GetProductImagesQueryHandler(
      asCatalogRepo({ getProductImages: async () => [], getProductById: async () => sinProducto }),
    );
    await assert.rejects(
      () => handler404.handle(99),
      (err: unknown) => err instanceof DomainError && err.code === 'PRODUCT_NOT_FOUND' && err.httpStatus === 404,
    );

    const conProducto: ProductDetailResult = {
      producto: { IDProducto: 1, IDCategoria: 1, Nombre: 'X', Activo: true },
      variantes: [],
    };
    const handlerVacio = new GetProductImagesQueryHandler(
      asCatalogRepo({ getProductImages: async () => [], getProductById: async () => conProducto }),
    );
    assert.deepEqual(await handlerVacio.handle(1), []);
  });
});

describe('Extensiones de tienda: favoritos (anti-IDOR)', () => {
  function favoritesRepoSpy() {
    const calls: Array<{ op: string; idUsuario: number; idProducto?: number }> = [];
    const repo: IFavoritesRepository = {
      list: async idUsuario => {
        calls.push({ op: 'list', idUsuario });
        return [];
      },
      listIds: async idUsuario => {
        calls.push({ op: 'listIds', idUsuario });
        return [{ IDProducto: 3 }, { IDProducto: 8 }];
      },
      add: async (idUsuario, idProducto) => {
        calls.push({ op: 'add', idUsuario, idProducto });
      },
      remove: async (idUsuario, idProducto) => {
        calls.push({ op: 'remove', idUsuario, idProducto });
      },
    };
    return { repo, calls };
  }

  it('el body solo acepta idProducto numérico; cualquier idUsuario enviado se descarta', () => {
    const parsed = AddFavoriteSchema.parse({ idProducto: 5, idUsuario: 999 });
    assert.deepEqual(parsed, { idProducto: 5 });
    assert.equal(AddFavoriteSchema.safeParse({ idProducto: '5' }).success, false);
    assert.equal(AddFavoriteSchema.safeParse({ idProducto: 0 }).success, false);
  });

  it('agregar y quitar operan siempre sobre el usuario del comando', async () => {
    const { repo, calls } = favoritesRepoSpy();
    await new AddFavoriteCommandHandler(repo).handle({ idUsuario: 7, idProducto: 3 });
    await new RemoveFavoriteCommandHandler(repo).handle({ idUsuario: 7, idProducto: 3 });
    assert.deepEqual(calls, [
      { op: 'add', idUsuario: 7, idProducto: 3 },
      { op: 'remove', idUsuario: 7, idProducto: 3 },
    ]);
  });

  it('los IDs de favoritos se devuelven como arreglo plano de números', async () => {
    const { repo, calls } = favoritesRepoSpy();
    const ids = await new GetFavoriteIdsQueryHandler(repo).handle({ idUsuario: 7 });
    assert.deepEqual(ids, [3, 8]);
    assert.deepEqual(calls, [{ op: 'listIds', idUsuario: 7 }]);
  });
});

describe('Extensiones de tienda: imagen de categoría', () => {
  it('acepta URL http(s) o null para quitarla y rechaza esquemas peligrosos', () => {
    assert.equal(SetCategoryImageSchema.safeParse({ imagenUrl: 'https://cdn.test/c.jpg' }).success, true);
    assert.equal(SetCategoryImageSchema.safeParse({ imagenUrl: null }).success, true);
    assert.equal(SetCategoryImageSchema.safeParse({ imagenUrl: 'javascript:alert(1)' }).success, false);
    assert.equal(SetCategoryImageSchema.safeParse({}).success, false);
  });
});

describe('Extensiones de tienda: perfil y contraseña', () => {
  function authRepo(partial: Partial<IAuthRepository>): IAuthRepository {
    return partial as unknown as IAuthRepository;
  }

  it('valida el nombre del perfil y recorta espacios', () => {
    assert.deepEqual(UpdateProfileSchema.parse({ nombreCompleto: '  Ana Pérez  ' }), { nombreCompleto: 'Ana Pérez' });
    assert.equal(UpdateProfileSchema.safeParse({ nombreCompleto: 'ab' }).success, false);
  });

  it('exige una contraseña nueva de 8 caracteres como mínimo y distinta a la actual', () => {
    assert.equal(ChangePasswordSchema.safeParse({ passwordActual: 'Admin123!', passwordNueva: 'Nueva456!' }).success, true);
    assert.equal(ChangePasswordSchema.safeParse({ passwordActual: 'Admin123!', passwordNueva: 'corta' }).success, false);
    assert.equal(ChangePasswordSchema.safeParse({ passwordActual: 'Admin123!', passwordNueva: 'Admin123!' }).success, false);
  });

  it('rechaza la contraseña actual incorrecta con 400 y no modifica nada', async () => {
    let cambiado = false;
    const hash = await bcrypt.hash('Correcta123!', 4);
    const handler = new ChangePasswordCommandHandler(
      authRepo({
        getByEmail: async () => ({ IDUsuario: 7, Correo: 'a@b.gt', NombreCompleto: 'A', Rol: 'CLIENTE', PasswordHash: hash, Activo: true }),
        changePassword: async () => {
          cambiado = true;
        },
      }),
    );
    await assert.rejects(
      () => handler.handle({ idUsuario: 7, correo: 'a@b.gt', passwordActual: 'Incorrecta1!', passwordNueva: 'Nueva456!' }),
      (err: unknown) => err instanceof DomainError && err.code === 'INVALID_CURRENT_PASSWORD' && err.httpStatus === 400,
    );
    assert.equal(cambiado, false);
  });

  it('guarda solo el hash bcrypt de la nueva contraseña, nunca el texto plano', async () => {
    let guardado: { id: number; hash: string } | undefined;
    const hash = await bcrypt.hash('Correcta123!', 4);
    const handler = new ChangePasswordCommandHandler(
      authRepo({
        getByEmail: async () => ({ IDUsuario: 7, Correo: 'a@b.gt', NombreCompleto: 'A', Rol: 'CLIENTE', PasswordHash: hash, Activo: true }),
        changePassword: async (id, h) => {
          guardado = { id, hash: h };
        },
      }),
    );
    await handler.handle({ idUsuario: 7, correo: 'a@b.gt', passwordActual: 'Correcta123!', passwordNueva: 'Nueva456!' });
    assert.equal(guardado?.id, 7);
    assert.notEqual(guardado?.hash, 'Nueva456!');
    assert.equal(await bcrypt.compare('Nueva456!', guardado!.hash), true);
  });

  it('rechaza con 403 si el correo del token no corresponde al usuario del token', async () => {
    const hash = await bcrypt.hash('Correcta123!', 4);
    const handler = new ChangePasswordCommandHandler(
      authRepo({
        getByEmail: async () => ({ IDUsuario: 99, Correo: 'otro@b.gt', NombreCompleto: 'O', Rol: 'CLIENTE', PasswordHash: hash, Activo: true }),
      }),
    );
    await assert.rejects(
      () => handler.handle({ idUsuario: 7, correo: 'otro@b.gt', passwordActual: 'Correcta123!', passwordNueva: 'Nueva456!' }),
      (err: unknown) => err instanceof DomainError && err.httpStatus === 403,
    );
  });

  it('el perfil se actualiza únicamente para el usuario del comando y con el nombre recortado', async () => {
    const llamadas: Array<{ id: number; nombre: string }> = [];
    const handler = new UpdateProfileCommandHandler(
      authRepo({
        updateProfile: async (id, nombre) => {
          llamadas.push({ id, nombre });
          return { IDUsuario: id, Correo: 'a@b.gt', NombreCompleto: nombre, Rol: 'CLIENTE', Activo: true, FechaCreacion: new Date() };
        },
      }),
    );
    await handler.handle({ idUsuario: 7, nombreCompleto: '  Ana Pérez ' });
    assert.deepEqual(llamadas, [{ id: 7, nombre: 'Ana Pérez' }]);
  });
});

describe('Extensiones de tienda: existencias bajas', () => {
  it('aplica paginación por defecto y limita el tamaño de página', () => {
    const parsed = GetLowStockSchema.parse({});
    assert.equal(parsed.pagina, 1);
    assert.equal(parsed.tamanoPagina, 20);
    assert.equal(GetLowStockSchema.safeParse({ tamanoPagina: 500 }).success, false);
  });

  it('el handler delega búsqueda y paginación al repositorio', async () => {
    const recibido: unknown[] = [];
    const repo = {
      getLowStock: async (q: string | undefined, pagina: number, tam: number) => {
        recibido.push(q, pagina, tam);
        return { items: [], totalRegistros: 0 };
      },
    } as unknown as IInventoryRepository;
    await new GetLowStockQueryHandler(repo).handle({ q: 'bota', pagina: 2, tamanoPagina: 10 });
    assert.deepEqual(recibido, ['bota', 2, 10]);
  });
});

describe('Extensiones de tienda: detalle de producto para administración', () => {
  it('devuelve el producto aunque esté inactivo, con sus variantes inactivas', async () => {
    const detalle: ProductDetailResult = {
      producto: { IDProducto: 5, IDCategoria: 1, Nombre: 'Descontinuado', Activo: false },
      variantes: [{ IDVariante: 9, SKU: 'DESC-1', Precio: 10, Activo: false }],
      imagenes: [],
    };
    const handler = new GetProductAdminQueryHandler(asCatalogRepo({ getProductByIdAdmin: async () => detalle }));
    const res = await handler.handle(5);
    assert.equal(res.producto?.Activo, false);
    assert.equal(res.variantes[0]?.Activo, false);
  });

  it('responde 404 si el producto no existe', async () => {
    const handler = new GetProductAdminQueryHandler(
      asCatalogRepo({ getProductByIdAdmin: async () => ({ producto: null, variantes: [] }) }),
    );
    await assert.rejects(
      () => handler.handle(404),
      (err: unknown) => err instanceof DomainError && err.code === 'PRODUCT_NOT_FOUND' && err.httpStatus === 404,
    );
  });
});
