import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ quiet: true });

interface ApiResponse {
  accessToken: string;
  usuario: { idUsuario: number };
  datos: { IDDireccion: number; IDMunicipio: number; IDCategoria: number }[];
  items: unknown[];
  IDProducto: number;
  IDVariante: number;
  resumen: { IDCarrito: number };
  codigo: string;
  total?: number;
  totalRegistros?: number;
  desdeCache: boolean;
  kpis: { TotalPedidosCompletados: number; VentasNetasQuetzales: number };
}


const enabled = process.env.RUN_AUDIT_INTEGRATION === '1';
test('Regresiones ', { skip: !enabled }, async t => {
  const database = process.env.AUDIT_DB_NAME;
  assert.ok(database && /^ShopCartAudit_[A-Za-z0-9_]+$/.test(database), 'AUDIT_DB_NAME debe identificar una base');
  const api = process.env.AUDIT_API_URL || 'http://localhost:3107/api/v1';
  assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/.test(api), 'Usar una API local ');
  const pool = await new sql.ConnectionPool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST!, port: Number(process.env.DB_PORT || 1433), database,
    options: { encrypt: false, trustServerCertificate: true },
  }).connect();
  t.after(async () => { await pool.close(); });

  async function call(method: string, path: string, body?: unknown, token?: string, expected = 200) {
    const response = await fetch(api + path, {
      method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json() as ApiResponse;
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
    return { data, cookie: response.headers.get('set-cookie') };
  }
  const suffix = randomUUID();
  let admin: string;
  let client: string;
  let other: string;
  let userId: number;
  let productId: number;
  let variantId: number;
  let cartId: number;
  let ownAddress: number;
  let foreignAddress: number;
  const correo = `fix-${suffix}@audit.example`;

  await t.test('las tres credenciales demo documentadas autentican', async () => {
    for (const email of ['admin@shopcart.gt', 'operador@shopcart.gt', 'cliente@shopcart.gt']) {
      const { data } = await call('POST', '/auth/login', { correo: email, password: 'Admin123!' });
      assert.ok(data.accessToken);
      if (email.startsWith('admin')) admin = data.accessToken;
    }
  });

  await t.test('registro HTTP crea usuario, sesión SQL y permite login y refresh', async () => {
    const registered = await call('POST', '/auth/register', { correo, password: 'Audit123!', nombreCompleto: 'Regresión auditoría' }, undefined, 201);
    client = registered.data.accessToken;
    userId = registered.data.usuario.idUsuario;
    assert.ok(registered.cookie?.includes('refreshToken='));
    await call('POST', '/auth/login', { correo, password: 'Audit123!' });
    const session = await pool.request().input('id', sql.Int, userId).query('SELECT COUNT(*) AS Total FROM RefreshTokens WHERE IDUsuario=@id AND Revocado=0');
    assert.ok(session.recordset[0].Total >= 2);
    const refreshToken = decodeURIComponent(registered.cookie!.match(/refreshToken=([^;]+)/)![1]!);
    await call('POST', '/auth/refresh', { refreshToken });
    const second = await call('POST', '/auth/register', { correo: `other-${suffix}@audit.example`, password: 'Audit123!', nombreCompleto: 'Otro cliente auditoría' }, undefined, 201);
    other = second.data.accessToken;
    const municipalities = (await call('GET', '/checkout/municipios')).data.datos;
    const addressData = { etiqueta: 'Casa', idMunicipio: municipalities[0]!.IDMunicipio, direccionExacta: 'Dirección exclusiva de regresión', telefonoContacto: '55555555' };
    ownAddress = (await call('POST', '/checkout/direcciones', addressData, client, 201)).data.datos[0]!.IDDireccion;
    foreignAddress = (await call('POST', '/checkout/direcciones', addressData, other, 201)).data.datos[0]!.IDDireccion;
    const category = (await call('GET', '/catalogo/categorias')).data.datos[0]!.IDCategoria;
    const product = (await call('POST', '/catalogo/productos', { idCategoria: category, nombre: 'Producto regresión auditoría', sku: 'FIX-' + suffix, precio: 100, existenciaInicial: 10 }, admin, 201)).data;
    productId = product.IDProducto;
    variantId = product.IDVariante;
    await call('POST', '/carrito/items', { idVariante: variantId, cantidad: 1 }, client);
    cartId = (await call('GET', '/carrito', undefined, client)).data.resumen.IDCarrito;
  });

  await t.test('dirección ajena da 403 en checkout y DELETE; ausente da 404; no hay falso éxito', async () => {
    await call('DELETE', '/checkout/direcciones/' + foreignAddress, undefined, client, 403);
    await call('POST', '/checkout/confirmar', { idCarrito: cartId, idDireccion: foreignAddress, claveIdempotencia: 'foreign-' + suffix }, client, 403);
    await call('DELETE', '/checkout/direcciones/2147483647', undefined, client, 404);
    await call('POST', '/checkout/confirmar', { idCarrito: cartId, idDireccion: 2147483647, claveIdempotencia: 'missing-' + suffix }, client, 404);
    const address = await pool.request().input('id', sql.Int, foreignAddress).query('SELECT Activo FROM Direcciones WHERE IDDireccion=@id');
    assert.equal(address.recordset[0].Activo, true);
    await call('DELETE', '/checkout/direcciones/' + foreignAddress, undefined, other);
    await call('DELETE', '/checkout/direcciones/' + foreignAddress, undefined, other, 404);
  });

  await t.test('producto desactivado desaparece y se rechaza en carrito y checkout con mensaje específico', async () => {
    await call('PATCH', '/catalogo/productos/' + productId, { activo: false }, admin);
    await call('GET', '/catalogo/productos/' + productId, undefined, undefined, 404);
    const added = await call('POST', '/carrito/items', { idVariante: variantId, cantidad: 1 }, client, 409);
    assert.equal(added.data.codigo, 'SQL_50041');
    const checkout = await call('POST', '/checkout/confirmar', { idCarrito: cartId, idDireccion: ownAddress, claveIdempotencia: 'inactive-' + suffix }, client, 409);
    assert.equal(checkout.data.codigo, 'SQL_50041');
    // The user can still remove an item that became unavailable.
    await call('POST', '/carrito/items', { idVariante: variantId, cantidad: 0 }, client);
    await call('PATCH', '/catalogo/productos/' + productId, { activo: true }, admin);
    await call('PUT', '/catalogo/variantes/' + variantId, { activo: false }, admin);
    assert.equal((await call('POST', '/carrito/items', { idVariante: variantId, cantidad: 1 }, client, 409)).data.codigo, 'SQL_50041');
  });

  await t.test('desactivar al usuario bloquea el JWT vigente y revoca sesiones refresh', async () => {
    await call('PATCH', '/auth/usuarios/' + userId + '/estado', { activo: false }, admin);
    await call('POST', '/carrito/items', { idVariante: variantId, cantidad: 0 }, client, 403);
    await call('POST', '/auth/login', { correo, password: 'Audit123!' }, undefined, 403);
    const sessions = await pool.request().input('id', sql.Int, userId).query('SELECT COUNT(*) AS Total FROM RefreshTokens WHERE IDUsuario=@id AND Revocado=0');
    assert.equal(sessions.recordset[0].Total, 0);
    await call('PATCH', '/auth/usuarios/' + userId + '/estado', { activo: true }, admin);
    await call('PATCH', '/auth/usuarios/' + userId + '/rol', { rol: 'OPERADOR' }, admin);
    await call('GET', '/auth/me', undefined, client, 401);
  });

  await t.test('cinco listados conservan total filtrado en páginas vacías', async () => {
    for (const path of ['/pedidos', '/auth/usuarios', '/catalogo/productos', '/inventario/kardex', '/bitacora']) {
      const first = (await call('GET', path + '?pagina=1&tamanoPagina=1', undefined, admin)).data;
      const empty = (await call('GET', path + '?pagina=999999&tamanoPagina=1', undefined, admin)).data;
      assert.equal(empty.total ?? empty.totalRegistros, first.total ?? first.totalRegistros, path);
      assert.ok((empty.total ?? empty.totalRegistros ?? 0) > 0, path);
      assert.equal((empty.datos ?? empty.items).length, 0, path);
    }
    for (const path of ['/auth/usuarios?q=absent-' + suffix, '/catalogo/productos?q=absent-' + suffix, '/inventario/kardex?idVariante=2147483647', '/bitacora?modulo=INEXISTENTE']) {
      const empty = (await call('GET', path + '&pagina=999999&tamanoPagina=1', undefined, admin)).data;
      assert.equal(empty.total ?? empty.totalRegistros, 0, path);
    }
    const orders = (await call('GET', '/pedidos?idCliente=' + userId + '&pagina=999999&tamanoPagina=1', undefined, admin)).data;
    assert.equal(orders.total, 0);
  });

  await t.test('caché diferencia dos horas del mismo día y coincide con SQL independiente', async () => {
    // Unique lower bound avoids cache populated by an earlier run.
    const start = `2026-11-01T00:00:00.${String(Date.now() % 1000).padStart(3, '0')}Z`;
    const shortEnd = '2026-11-01T00:01:00Z';
    const fullEnd = '2026-11-01T23:59:59Z';
    const request = (end: string) => call('GET', '/dashboard/resumen?fechaInicio=' + start + '&fechaFin=' + end, undefined, admin);
    const short = (await request(shortEnd)).data;
    const full = (await request(fullEnd)).data;
    assert.equal(short.desdeCache, false);
    assert.equal(full.desdeCache, false);
    for (const [end, actual] of [[shortEnd, short], [fullEnd, full]] as const) {
      const expected = await pool.request().input('start', sql.DateTime2, new Date(start)).input('end', sql.DateTime2, new Date(end)).query("SELECT COUNT(*) AS Total, ISNULL(SUM(p.Total-p.MontoReembolsado),0) AS Neto FROM Pedidos p JOIN EstadosPedido ep ON p.IDEstadoPedido=ep.IDEstadoPedido WHERE ep.Codigo IN ('ENTREGADO','DEVUELTO_PARCIAL','DEVUELTO_TOTAL') AND p.FechaCreacion BETWEEN @start AND @end");
      assert.equal(actual.kpis.TotalPedidosCompletados, expected.recordset[0].Total);
      assert.equal(actual.kpis.VentasNetasQuetzales, expected.recordset[0].Neto);
    }
    assert.equal((await request(fullEnd)).data.desdeCache, true);
  });
});
