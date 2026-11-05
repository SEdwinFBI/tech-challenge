require("dotenv").config({ quiet: true });
const fs = require("fs"), assert = require("assert/strict"), { randomUUID } = require("crypto");
const api = process.env.AUDIT_API_URL || "http://localhost:3107/api/v1", password = process.env.AUDIT_PASSWORD;
const expiryWaitMs = Number(process.env.AUDIT_RESERVATION_WAIT_MS || 70000);
async function verify() {
  assert.match(api, /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/);
  assert.ok(password, "AUDIT_PASSWORD es obligatorio");
  const prefix = "EXTRA-" + randomUUID().slice(0, 13), evidence = { api, prefix, cases: [] }, products = [];
  async function call(method, path, body, token, status = 200) {
    const r = await fetch(api + path, { method, headers: { "content-type": "application/json", ...token ? { authorization: "Bearer " + token } : {} }, body: body === void 0 ? void 0 : JSON.stringify(body) });
    const data = await r.json();
    if (status !== null) assert.equal(r.status, status, JSON.stringify({ method, path, status: r.status, codigo: data.codigo, mensaje: data.mensaje }));
    return { status: r.status, data };
  }
  const admin = (await call("POST", "/auth/login", { correo: "admin@shopcart.gt", password })).data.accessToken;
  const category = (await call("GET", "/catalogo/categorias")).data.datos[0].IDCategoria;
  const municipality = (await call("GET", "/checkout/municipios")).data.datos[0].IDMunicipio;
  async function newClient(i) {
    const user = (await call("POST", "/auth/register", { correo: (prefix + "-" + i + "@audit.example").toLowerCase(), password, nombreCompleto: prefix + " " + i }, void 0, 201)).data;
    const token = user.accessToken;
    const aid = (await call("POST", "/checkout/direcciones", { etiqueta: "Extra", idMunicipio: municipality, direccionExacta: prefix, telefonoContacto: "55555555" }, token, 201)).data.datos[0].IDDireccion;
    return { token, id: user.usuario.idUsuario, aid, cid: null };
  }
  const clients = await Promise.all(Array.from({ length: 10 }, (_, i) => newClient(i)));
  const pidOf = {};
  async function product(label, stock) {
    const p = (await call("POST", "/catalogo/productos", { idCategoria: category, nombre: prefix + " " + label, sku: (prefix + "-" + label).slice(0, 50), precio: 100, existenciaInicial: stock }, admin, 201)).data;
    products.push(p.IDVariante);
    pidOf[p.IDVariante] = p.IDProducto;
    return { pid: p.IDProducto, vid: p.IDVariante };
  }
  async function add(client, vid) {
    await call("POST", "/carrito/items", { idVariante: vid, cantidad: 1 }, client.token);
    client.cid = (await call("GET", "/carrito", void 0, client.token)).data.resumen.IDCarrito;
  }
  async function clear() {
    for (const client of clients) {
      if (!client.cid) continue;
      for (const item of (await call("GET", "/carrito", void 0, client.token)).data.items) await call("POST", "/carrito/items", { idVariante: item.IDVariante, cantidad: 0 }, client.token);
      await call("DELETE", "/cupones/aplicar", void 0, client.token);
    }
  }
  const confirm = (client, key) => call("POST", "/checkout/confirmar", { idCarrito: client.cid, idDireccion: client.aid, claveIdempotencia: key }, client.token, null);
  const reserve = (client) => call("POST", "/checkout/reservar", { idCarrito: client.cid }, client.token, null);
  async function inventory(pid, vid) {
    return (await call("GET", "/catalogo/productos/" + pid + "/inventario", void 0, admin)).data.variantes.find((v) => v.IDVariante === vid);
  }
  async function couponUses(code) {
    return (await call("GET", "/cupones?q=" + encodeURIComponent(code), void 0, admin)).data.datos.find((c) => c.Codigo.toLowerCase() === code.toLowerCase()).UsosActuales;
  }

  const cp = await product("coupon", 20);
  const code = ("EXTRA-" + randomUUID()).slice(0, 50);
  await call("POST", "/cupones", { codigo: code, tipoDescuento: "MONTO_FIJO", valor: 10, montoMinimoCompra: 0, limiteTotalUsos: 3, limiteUsosPorCliente: 1, fechaInicio: new Date(Date.now() - 864e5), fechaFin: new Date(Date.now() + 864e5) }, admin, 201);
  for (const client of clients) { await add(client, cp.vid); await call("POST", "/cupones/aplicar", { codigo: code }, client.token); }
  const coupons = await Promise.all(clients.map((client, i) => confirm(client, prefix + "-cup-" + i)));
  const okCoupons = coupons.filter((x) => x.status === 201), failed = coupons.filter((x) => x.status !== 201);
  assert.equal(okCoupons.length, 3);
  assert.equal(failed.length, 7);
  assert.deepEqual([...new Set(failed.map((x) => x.data.codigo))], ["COUPON_EXHAUSTED"]);
  assert.equal(await couponUses(code), 3);
  assert.equal((await inventory(cp.pid, cp.vid)).ExistenciaFisica, 17);
  evidence.cases.push({ scenario: "cupon-limite-3-con-10-clientes", exitosos: okCoupons.length, fallidos: failed.length, codigoFallo: failed[0].data.codigo, status: failed[0].status, usos: 3, stock: 17 });
  await clear();

  const sp = await product("oversell", 5);
  for (const client of clients) await add(client, sp.vid);
  const sells = await Promise.all(clients.map((client, i) => confirm(client, prefix + "-sell-" + i)));
  assert.equal(sells.filter((x) => x.status === 201).length, 5);
  assert.equal(sells.filter((x) => x.status === 409).length, 5);
  assert.equal((await inventory(sp.pid, sp.vid)).ExistenciaFisica, 0);
  evidence.cases.push({ scenario: "stock-5-con-10-clientes", exitosos: 5, rechazados: 5, stock: 0 });
  await clear();

  const ip = await product("idemuser", 10);
  await add(clients[0], ip.vid); await add(clients[1], ip.vid);
  const sharedKey = prefix + "-shared-key";
  const first = await confirm(clients[0], sharedKey);
  assert.equal(first.status, 201);
  const second = await confirm(clients[1], sharedKey);
  assert.equal(second.status, 409);
  assert.equal(second.data.codigo, "CLAVE_IDEMPOTENCIA_EN_USO");
  assert.notEqual(second.data.IDPedido, first.data.IDPedido, "otro usuario recibio el pedido ajeno");
  for (const estado of ["AUTORIZADO", "PENDIENTE_CONCILIACION"]) {
    const pagos = (await call("GET", "/checkout/pagos?tamanoPagina=100&estado=" + estado, void 0, admin)).data.datos;
    assert.equal(pagos.filter((p) => p.ClaveIdempotencia === sharedKey && p.IDUsuario === clients[1].id).length, 0);
  }
  evidence.cases.push({ scenario: "misma-clave-otro-usuario", primero: first.status, segundo: second.status, codigo: second.data.codigo, pedidoPropio: first.data.IDPedido, pedidoDelSegundo: second.data.IDPedido ?? null, stock: (await inventory(ip.pid, ip.vid)).ExistenciaFisica });
  await clear();

  const ep = await product("expira", 1), lp = await product("expira-sola", 1);
  await add(clients[2], ep.vid); await add(clients[3], ep.vid); await add(clients[4], lp.vid);
  assert.equal((await reserve(clients[2])).status, 200);
  assert.equal((await reserve(clients[3])).status, 409);
  assert.equal((await reserve(clients[4])).status, 200);
  const held = await inventory(ep.pid, ep.vid);
  assert.equal(held.UnidadesReservadas, 1);
  assert.equal(held.ExistenciaDisponible, 0);
  await new Promise((resolve) => setTimeout(resolve, expiryWaitMs));
  const released = await inventory(ep.pid, ep.vid);
  assert.equal(released.UnidadesReservadas, 0);
  assert.equal(released.ExistenciaDisponible, 1);
  assert.equal((await reserve(clients[3])).status, 200);
  const lateOwner = await confirm(clients[2], prefix + "-late-owner");
  assert.equal(lateOwner.status, 409);
  assert.equal(lateOwner.data.codigo, "RESERVA_VENCIDA");
  const lateAlone = await confirm(clients[4], prefix + "-late-alone");
  assert.equal(lateAlone.status, 409);
  assert.equal(lateAlone.data.codigo, "RESERVA_VENCIDA");
  evidence.cases.push({ scenario: "reserva-expirada", disponibleTrasExpirar: released.ExistenciaDisponible, otroClienteReserva: 200, confirmacionDelTitularVencido: lateOwner.status, codigo: lateOwner.data.codigo, confirmacionSinCompetencia: lateAlone.status });
  await clear();

  await call("POST", "/inventario/movimientos", { idVariante: ip.vid, tipoMovimiento: "ENTRADA_COMPRA", cantidad: 3, motivo: "Reposicion extra de auditoria" }, admin, 201);
  const reconciled = [];
  for (const vid of products) {
    const movimientos = [];
    for (let page = 1; ; page++) {
      const r = (await call("GET", "/inventario/kardex?idVariante=" + vid + "&tamanoPagina=100&pagina=" + page, void 0, admin)).data;
      movimientos.push(...r.items);
      if (movimientos.length >= r.totalRegistros) break;
    }
    const inv = await inventory(pidOf[vid], vid), suma = movimientos.reduce((s, m) => s + m.Cantidad, 0);
    assert.equal(inv.ExistenciaFisica, suma, "kardex descuadrado en variante " + vid);
    const ultimo = movimientos.reduce((a, b) => (Number(a.IDKardex) > Number(b.IDKardex) ? a : b));
    assert.equal(ultimo.SaldoPosterior, inv.ExistenciaFisica);
    reconciled.push({ idVariante: vid, existencia: inv.ExistenciaFisica, sumaKardex: suma, movimientos: movimientos.length });
  }
  evidence.cases.push({ scenario: "conciliacion-kardex", variantes: reconciled });
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync("artifacts/concurrencia-extra.json", JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
require("node:test")("Concurrencia extra: cupon, expiracion, idempotencia y kardex", { skip: process.env.RUN_AUDIT_INTEGRATION !== "1" }, verify);
