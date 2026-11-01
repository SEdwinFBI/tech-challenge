
require("dotenv").config({ quiet: true });
const sql = require("mssql"), fs = require("fs"), assert = require("assert/strict"), { randomUUID } = require("crypto");
async function verify() {
  const database = process.env.AUDIT_DB_NAME || "ShopCartAudit_20261101", api = process.env.AUDIT_API_URL || "http://localhost:3107/api/v1";
  assert.match(database, /^ShopCartAudit_[A-Za-z0-9_]+$/);
  assert.match(api, /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/);
  const pool = await new sql.ConnectionPool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_HOST, port: Number(process.env.DB_PORT || 1433), database, options: { encrypt: false, trustServerCertificate: true } }).connect();
  const prefix = "RACE-" + randomUUID(), evidence = { database, api, prefix, cases: [] };
  let triggerInstalled = false;
  async function call(method, path, body, token, status = 200) {
    const r = await fetch(api + path, { method, headers: { "content-type": "application/json", ...token ? { authorization: "Bearer " + token } : {} }, body: body === void 0 ? void 0 : JSON.stringify(body) });
    const data = await r.json();
    if (status !== null) assert.equal(r.status, status, JSON.stringify({ method, path, status: r.status, codigo: data.codigo, mensaje: data.mensaje }));
    return { status: r.status, data };
  }
  async function query(q, params = {}) {
    const req = pool.request();
    for (const [k, v] of Object.entries(params)) req.input(k, Number.isInteger(v) ? sql.Int : sql.VarChar(100), v);
    return (await req.query(q)).recordset;
  }
  try {
    const admin = (await call("POST", "/auth/login", { correo: "admin@shopcart.gt", password: "Admin123!" })).data.accessToken;
    const category = (await call("GET", "/catalogo/categorias")).data.datos[0].IDCategoria;
    const municipality = (await call("GET", "/checkout/municipios")).data.datos[0].IDMunicipio;
    const clients = [];
    for (let i = 0; i < 2; i++) {
      const user = (await call("POST", "/auth/register", { correo: (prefix + "-" + i + "@audit.example").toLowerCase(), password: "RaceAudit123!", nombreCompleto: prefix + " " + i }, void 0, 201)).data;
      const token = user.accessToken;
      const aid = (await call("POST", "/checkout/direcciones", { etiqueta: "Race", idMunicipio: municipality, direccionExacta: prefix, telefonoContacto: "55555555" }, token, 201)).data.datos[0].IDDireccion;
      await call("POST", "/carrito/items", { idVariante: (await query("SELECT TOP 1 v.IDVariante FROM Variantes v JOIN Productos p ON v.IDProducto=p.IDProducto JOIN Categorias c ON p.IDCategoria=c.IDCategoria WHERE v.Activo=1 AND p.Activo=1 AND c.Activo=1 AND v.ExistenciaFisica>1 ORDER BY v.IDVariante"))[0].IDVariante, cantidad: 0 }, token);
      const cid = (await call("GET", "/carrito", void 0, token)).data.resumen.IDCarrito;
      clients.push({ token, id: user.usuario.idUsuario, aid, cid });
    }
    async function clear() {
      for (const client of clients) {
        const items = (await call("GET", "/carrito", void 0, client.token)).data.items;
        for (const item of items) await call("POST", "/carrito/items", { idVariante: item.IDVariante, cantidad: 0 }, client.token);
        await call("DELETE", "/cupones/aplicar", void 0, client.token);
      }
    }
    async function product(label, stock2) {
      const p = (await call("POST", "/catalogo/productos", { idCategoria: category, nombre: prefix + " " + label, sku: (prefix.slice(0, 22) + "-" + label).slice(0, 50), precio: 100, existenciaInicial: stock2 }, admin, 201)).data;
      return { pid: p.IDProducto, vid: p.IDVariante };
    }
    async function add(client, vid) {
      await call("POST", "/carrito/items", { idVariante: vid, cantidad: 1 }, client.token);
    }
    async function confirm(client, key) {
      return call("POST", "/checkout/confirmar", { idCarrito: client.cid, idDireccion: client.aid, claveIdempotencia: key }, client.token, null);
    }
    async function stock(vid) {
      return (await query("SELECT ExistenciaFisica AS Stock FROM Variantes WHERE IDVariante=@id", { id: vid }))[0].Stock;
    }
    await clear();
    const idemProduct = await product("idem", 10);
    await add(clients[0], idemProduct.vid);
    const idemKey = prefix + "-idem";
    const idem = await Promise.all(Array.from({ length: 5 }, () => confirm(clients[0], idemKey)));
    assert.deepEqual(idem.map((x) => x.status).sort(), [200, 200, 200, 200, 201]);
    assert.equal(new Set(idem.map((x) => x.data.IDPedido)).size, 1);
    assert.equal((await query("SELECT COUNT(*) AS Total FROM Pedidos WHERE ClaveIdempotencia=@key", { key: idemKey }))[0].Total, 1);
    assert.equal(await stock(idemProduct.vid), 9);
    evidence.cases.push({ scenario: "idempotencia-5-simultaneas", statuses: idem.map((x) => x.status), pedido: idem[0].data.IDPedido, stock: 9 });
    for (let round = 1; round <= 10; round++) {
      await clear();
      const p = await product("last-" + round, 1);
      for (const client of clients) await add(client, p.vid);
      const results = await Promise.all(clients.map((client, i) => confirm(client, prefix + "-last-" + round + "-" + i)));
      assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
      assert.equal(await stock(p.vid), 0);
      const orders = (await query("SELECT COUNT(DISTINCT IDPedido) AS Total FROM PedidoDetalles WHERE IDVariante=@id", { id: p.vid }))[0].Total;
      assert.equal(orders, 1);
      evidence.cases.push({ scenario: "ultima-unidad-sin-reserva", round, statuses: results.map((x) => x.status), stock: 0, orders });
    }
    for (let round = 1; round <= 10; round++) {
      await clear();
      const reservedProduct = await product("reserved-" + round, 1);
      for (const client of clients) await add(client, reservedProduct.vid);
      const reservations = await Promise.all(clients.map((client) => call("POST", "/checkout/reservar", { idCarrito: client.cid }, client.token, null)));
      assert.deepEqual(reservations.map((x) => x.status).sort(), [200, 409]);
      const reservedUnits = (await query("SELECT SUM(r.Cantidad) AS Total FROM ReservasInventario r JOIN EstadosReserva e ON r.IDEstadoReserva=e.IDEstadoReserva WHERE r.IDVariante=@id AND e.Codigo='ACTIVA' AND r.FechaExpiracion>SYSDATETIME()", { id: reservedProduct.vid }))[0].Total;
      assert.equal(reservedUnits, 1);
      const reservedCheckout = await Promise.all(clients.map((client, i) => confirm(client, prefix + "-reserved-" + round + "-" + i)));
      assert.deepEqual(reservedCheckout.map((x) => x.status).sort(), [201, 409]);
      assert.equal(await stock(reservedProduct.vid), 0);
      evidence.cases.push({ scenario: "ultima-unidad-con-reservas", round, reservedUnits, reservations: reservations.map((x) => x.status), checkouts: reservedCheckout.map((x) => x.status), stock: 0 });
    }
    await clear();
    const cp = await product("coupon", 10), code = ("LAST-" + randomUUID()).slice(0, 50);
    const coupon = (await call("POST", "/cupones", { codigo: code, tipoDescuento: "MONTO_FIJO", valor: 10, montoMinimoCompra: 0, limiteTotalUsos: 1, limiteUsosPorCliente: 1, fechaInicio: new Date(Date.now() - 864e5), fechaFin: new Date(Date.now() + 864e5) }, admin, 201)).data;
    for (const client of clients) {
      await add(client, cp.vid);
      await call("POST", "/cupones/aplicar", { codigo: code }, client.token);
    }
    const coupons = await Promise.all(clients.map((client, i) => confirm(client, prefix + "-coupon-" + i)));
    assert.deepEqual(coupons.map((x) => x.status).sort(), [201, 409]);
    const uses = (await query("SELECT UsosActuales FROM Cupones WHERE Codigo=@code", { code }))[0].UsosActuales;
    assert.equal(uses, 1);
    assert.equal(await stock(cp.vid), 9);
    evidence.cases.push({ scenario: "ultimo-uso-cupon", statuses: coupons.map((x) => x.status), uses, stock: 9 });
    await clear();
    const rp = await product("rollback", 3);
    await add(clients[0], rp.vid);
    const rollbackCoupon = "RB-" + randomUUID();
    await call("POST", "/cupones", { codigo: rollbackCoupon, tipoDescuento: "MONTO_FIJO", valor: 5, montoMinimoCompra: 0, limiteTotalUsos: 3, limiteUsosPorCliente: 3, fechaInicio: new Date(Date.now() - 864e5), fechaFin: new Date(Date.now() + 864e5) }, admin, 201);
    await call("POST", "/cupones/aplicar", { codigo: rollbackCoupon }, clients[0].token);
    await call("POST", "/checkout/reservar", { idCarrito: clients[0].cid }, clients[0].token);
    async function snapshot() {
      return (await query("SELECT (SELECT COUNT(*) FROM Pedidos) AS Pedidos,(SELECT COUNT(*) FROM PedidoDetalles) AS Detalles,(SELECT COUNT(*) FROM Kardex) AS Kardex,(SELECT SUM(ExistenciaFisica) FROM Variantes) AS StockTotal,(SELECT SUM(UsosActuales) FROM Cupones) AS UsosCupones,(SELECT COUNT(*) FROM CarritoItems WHERE IDCarrito=" + clients[0].cid + ") AS ItemsCarrito,(SELECT COUNT(*) FROM ReservasInventario r JOIN EstadosReserva e ON r.IDEstadoReserva=e.IDEstadoReserva WHERE r.IDCarrito=" + clients[0].cid + " AND e.Codigo='ACTIVA') AS ReservasActivas"))[0];
    }
    const before = await snapshot();
    await pool.request().batch("CREATE OR ALTER TRIGGER dbo.TR_Audit_Final_Rollback ON dbo.Kardex AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE IDVariante=" + rp.vid + ") THROW 50999, 'Fallo tardio deliberado de auditoria aislada', 1; END;");
    triggerInstalled = true;
    let rollback;
    try {
      rollback = await confirm(clients[0], prefix + "-rollback");
      assert.equal(rollback.status, 400);
      assert.equal(rollback.data.codigo, "SQL_50999");
      const after = await snapshot();
      assert.deepEqual(after, before);
      evidence.cases.push({ scenario: "rollback-tardio-kardex", status: rollback.status, codigo: rollback.data.codigo, before, after });
    } finally {
      await pool.request().batch("DROP TRIGGER IF EXISTS dbo.TR_Audit_Final_Rollback");
      triggerInstalled = false;
    }
    assert.equal((await query("SELECT COUNT(*) AS Total FROM sys.triggers WHERE name='TR_Audit_Final_Rollback'"))[0].Total, 0);
    const retry = await confirm(clients[0], prefix + "-rollback");
    assert.equal(retry.status, 201);
    evidence.cases.push({ scenario: "reintento-tras-rollback", status: retry.status, pedido: retry.data.IDPedido });
    fs.writeFileSync("artifacts/final-concurrency-http.json", JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ database, scenarios: evidence.cases.length, allPassed: true, rollbackTriggerRemoved: true }));
  } finally {
    if (triggerInstalled) await pool.request().batch("DROP TRIGGER IF EXISTS dbo.TR_Audit_Final_Rollback");
    await pool.close();
  }
}
require("node:test")("Concurrencia HTTP/SQL real y rollback (base aislada)", { skip: process.env.RUN_AUDIT_INTEGRATION !== "1" }, verify);
