import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { getDbPool, sql } from '@/core/config/db';
import { env } from '@/core/config/env';
import { RecommendationRepository } from '@/features/recomendaciones/repository/recomendaciones.repository';
import { FavoritesRepository } from '@/features/favoritos/repository/favoritos.repository';
import { CatalogRepository } from '@/features/catalogo/repository/catalogo.repository';
import { CartRepository } from '@/features/carrito/repository/carrito.repository';
import { recomendacionesRouter } from '@/features/recomendaciones/recomendaciones.routes';
import { globalErrorHandler } from '@/core/middlewares/error.middleware';
import jwt from 'jsonwebtoken';
import { catalogoRouter } from '@/features/catalogo/catalogo.routes';
import { SearchCandidateRepository } from '@/features/recomendaciones/repository/search-candidate.repository';
import { CatalogReviewRepository } from '@/features/catalogo/repository/catalog-review.repository';

test('SQL y HTTP de recomendaciones: vistas, favoritos, carrito y aislamiento', {
  skip: process.env.RUN_RECOMMENDATION_INTEGRATION !== '1',
}, async () => {
  assert.equal(env.DB_NAME, 'ShopCartRecommendations_test');
  const pool = await getDbPool();
  const app = express();
  app.use(express.json());
  app.use('/recomendaciones', recomendacionesRouter);
  app.use('/catalogo', catalogoRouter);
  app.use(globalErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/recomendaciones`;
  try {
    const tag = randomUUID();
    const user = await pool.request().input('Correo', sql.NVarChar(150), `${tag}@test.invalid`).query(`
      INSERT INTO Usuarios (IDRol, Correo, Password, Nombre)
      OUTPUT INSERTED.IDUsuario
      SELECT IDRol, @Correo, 'test-only', 'Prueba recomendaciones' FROM Roles WHERE Codigo = 'CLIENTE'`);
    const idUsuario = user.recordset[0].IDUsuario as number;
    const catalog = new CatalogRepository();
    const categories = await catalog.getCategories(true);
    const admin = await pool.request().query("SELECT TOP (1) IDUsuario FROM Usuarios u INNER JOIN Roles r ON u.IDRol = r.IDRol WHERE r.Codigo = 'ADMINISTRADOR'");
    const product = await catalog.createProductWithVariant({ idCategoria: categories[0]!.IDCategoria, nombre: 'Rec ' + tag,
      sku: tag, precio: 100, existenciaInicial: 8, idAdmin: admin.recordset[0].IDUsuario });
    assert.ok(product.IDVariante);
    const owner = { propietario: `u:${idUsuario}`, idUsuario };
    const repo = new RecommendationRepository();
    await Promise.all(Array.from({ length: 8 }, () => repo.recordView(owner, product.IDProducto)));
    let context = await repo.context(owner);
    assert.equal(context.signals.find(s => s.Tipo === 'VISTA')?.Peso, 1);
    assert.equal((await repo.context({ propietario: `u:${idUsuario + 100000}` })).signals.length, 0);
    const favorites = new FavoritesRepository();
    await favorites.add(idUsuario, product.IDProducto);
    context = await repo.context(owner);
    assert.equal(context.signals.find(s => s.Tipo === 'FAVORITO')?.Peso, 3);
    const favoritesContext = await repo.context(owner, undefined, 'favoritos');
    assert.ok(favoritesContext.signals.every(s => s.Tipo === 'FAVORITO'));
    assert.ok(!favoritesContext.candidates.some(p => p.IDProducto === product.IDProducto));
    await favorites.remove(idUsuario, product.IDProducto);
    assert.ok(!(await repo.context(owner)).signals.some(s => s.Tipo === 'FAVORITO'));
    const cart = new CartRepository();
    await cart.upsertItem({ idUsuario, idVariante: product.IDVariante, cantidad: 2 });
    context = await repo.context(owner);
    assert.equal(context.signals.find(s => s.Tipo === 'CARRITO')?.Peso, 4);
    assert.ok(!context.candidates.some(p => p.IDProducto === product.IDProducto));
    await cart.upsertItem({ idUsuario, idVariante: product.IDVariante, cantidad: 0 });
    assert.ok(!(await repo.context(owner)).signals.some(s => s.Tipo === 'CARRITO'));
    const order = await pool.request().input('Usuario', sql.Int, idUsuario)
      .input('Clave', sql.VarChar(100), tag).input('Variante', sql.Int, product.IDVariante).query(`
      INSERT INTO Direcciones (IDUsuario, IDMunicipio, Etiqueta, Direccion, Telefono)
      SELECT TOP (1) @Usuario, IDMunicipio, 'Test', 'Direccion prueba', '55555555' FROM Municipios;
      DECLARE @Direccion INT = SCOPE_IDENTITY();
      INSERT INTO Pedidos (IDUsuario, IDDireccion, IDEstadoPedido, ClaveIdempotencia, Subtotal, Descuento, Total)
      SELECT @Usuario, @Direccion, IDEstadoPedido, @Clave, 100, 0, 100 FROM EstadosPedido WHERE Codigo = 'PAGADO';
      DECLARE @Pedido INT = SCOPE_IDENTITY();
      INSERT INTO PedidoDetalles (IDPedido, IDVariante, CantidadComprada, PrecioUnitarioCongelado, PrecioNetoUnitario, SubtotalLinea)
      VALUES (@Pedido, @Variante, 1, 100, 100, 100);
      SELECT @Pedido AS IDPedido;`);
    assert.equal((await repo.context(owner)).signals.find(s => s.Tipo === 'COMPRA')?.Peso, 6);
    await pool.request().input('Pedido', sql.Int, order.recordset[0].IDPedido).query(
      "UPDATE Pedidos SET IDEstadoPedido = (SELECT IDEstadoPedido FROM EstadosPedido WHERE Codigo = 'CANCELADO') WHERE IDPedido = @Pedido");
    assert.ok(!(await repo.context(owner)).signals.some(s => s.Tipo === 'COMPRA'));
    await pool.request().input('Owner', sql.VarChar(70), owner.propietario).query(
      'UPDATE RecomendacionVistas SET UltimaVista = DATEADD(DAY, -14, SYSDATETIME()) WHERE Propietario = @Owner');
    assert.equal((await repo.context(owner)).signals.find(s => s.Tipo === 'VISTA')?.Peso, 0.5);
    assert.ok(!(await repo.context(owner, product.IDProducto)).candidates.some(p => p.IDProducto === product.IDProducto));
    assert.equal((await fetch(base)).status, 400);
    const headers = { 'X-Guest-Token': tag, 'Content-Type': 'application/json' };
    assert.equal((await fetch(base + '/vistas', { method: 'POST', headers, body: JSON.stringify({ idProducto: product.IDProducto }) })).status, 204);
    assert.equal((await fetch(base + '/vistas', { method: 'POST', headers, body: '{"idProducto":-1}' })).status, 400);
    const response = await fetch(base + `?idProducto=${product.IDProducto}`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    const result = await response.json() as { items: Array<{ IDProducto: number; StockTotalDisponible: number }> };
    assert.equal(result.items.length, 10);
    assert.ok(result.items.every((p: { IDProducto: number; StockTotalDisponible: number }) => p.IDProducto !== product.IDProducto && p.StockTotalDisponible > 0));
    const offers = await repo.context(owner, undefined, 'ofertas', { precioMin: 50, precioMax: 500 });
    assert.ok(offers.candidates.length > 0);
    assert.ok(offers.candidates.every(p => (p.PorcentajeDescuento ?? 0) >= 1 && (p.PrecioOferta ?? 0) >= 50 && (p.PrecioOferta ?? 0) <= 500));
    assert.equal((await fetch(base + '?contexto=inicio', { headers })).status, 200);
    assert.equal((await fetch(base + '?contexto=ofertas&precioMin=100&precioMax=10', { headers })).status, 400);
    const searchRepo = new SearchCandidateRepository();
    for (const q of ['camisa', 'camisa azul', 'audifonos bluetooth', 'tenis deportivos']) {
      const candidates = await searchRepo.candidates({ q });
      assert.ok(candidates.length <= 20);
      const normal = await catalog.getProducts({ q, pagina: 1, tamanoPagina: 100, orden: 'RECIENTES', soloDisponibles: true, incluirInactivos: false });
      const normalIds = new Set(normal.items.map(p => p.IDProducto));
      assert.ok(candidates.every(p => !normalIds.has(p.IDProducto)));
    }
    assert.ok((await searchRepo.candidates({ q: 'camisa azul' })).length > 0);
    const reviewContext = await new CatalogReviewRepository().context({ nombre: 'Camisa de cuadros azul y negro' });
    assert.ok(reviewContext.categories.length > 0);
    assert.ok(reviewContext.products.some(p => p.Nombre === 'Camisa de cuadros azul y negro'));
    const reviewUrl = `http://127.0.0.1:${address.port}/catalogo/revision`;
    const reviewBody = JSON.stringify({ nombre: 'Camisa de cuadros azul y negro' });
    assert.equal((await fetch(reviewUrl, { method: 'POST', headers, body: reviewBody })).status, 401);
    const clientToken = jwt.sign({ idUsuario, correo: `${tag}@test.invalid`, rol: 'CLIENTE' }, env.JWT_ACCESS_SECRET);
    assert.equal((await fetch(reviewUrl, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${clientToken}` }, body: reviewBody })).status, 403);
    const adminData = await pool.request().input('Id', sql.Int, admin.recordset[0].IDUsuario).query('SELECT IDUsuario, Correo FROM Usuarios WHERE IDUsuario = @Id');
    const adminToken = jwt.sign({ idUsuario: adminData.recordset[0].IDUsuario, correo: adminData.recordset[0].Correo, rol: 'ADMINISTRADOR' }, env.JWT_ACCESS_SECRET);
    const review = await fetch(reviewUrl, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${adminToken}` }, body: reviewBody });
    assert.equal(review.status, 200);
    const reviewResult = await review.json() as { posiblesDuplicados: Array<{ Nombre: string }>; evaluacionDisponible: boolean };
    assert.equal(reviewResult.evaluacionDisponible, false);
    assert.ok(reviewResult.posiblesDuplicados.some(p => p.Nombre === 'Camisa de cuadros azul y negro'));
    const seedCounts = await pool.request().query("SELECT (SELECT COUNT(*) FROM Productos) Productos, (SELECT COUNT(*) FROM Variantes WHERE SKU LIKE 'DEMO-EXTRA-%') Extras, (SELECT COUNT(*) FROM ProductoImagenes) Imagenes");
    assert.equal(seedCounts.recordset[0].Extras, 20);
    await pool.request().execute('SP_Sistema_AplicarSeed');
    await pool.request().execute('SP_Sistema_AplicarSeed');
    const afterCounts = await pool.request().query("SELECT (SELECT COUNT(*) FROM Productos) Productos, (SELECT COUNT(*) FROM Variantes WHERE SKU LIKE 'DEMO-EXTRA-%') Extras, (SELECT COUNT(*) FROM ProductoImagenes) Imagenes");
    assert.deepEqual(afterCounts.recordset, seedCounts.recordset);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    await pool.close();
  }
});
