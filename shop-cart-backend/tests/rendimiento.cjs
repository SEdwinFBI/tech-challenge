require("dotenv").config({ quiet: true });
const fs = require("fs"), os = require("os"), path = require("path"), assert = require("assert/strict");
const api = process.env.AUDIT_API_URL, password = process.env.AUDIT_PASSWORD;
const runs = Number(process.env.PERF_RUNS || 20), warmups = Number(process.env.PERF_WARMUPS || 3);
const outFile = process.env.PERF_OUT || path.join("artifacts", "rendimiento.md");
assert.match(api || "", /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/, "AUDIT_API_URL es obligatorio");
assert.ok(password, "AUDIT_PASSWORD es obligatorio");

async function login(correo) {
  const r = await fetch(api + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ correo, password }) });
  assert.equal(r.status, 200, "login " + correo);
  return (await r.json()).accessToken;
}
async function get(p, token) {
  const r = await fetch(api + p, { headers: token ? { authorization: "Bearer " + token } : {} });
  return r;
}
function rowsOf(data) {
  const list = ["items", "datos", "productos"].map((k) => data[k]).find(Array.isArray);
  const total = data.totalRegistros ?? data.total;
  const returned = list ? list.length : data.top10Productos ? data.top10Productos.length : data.producto || data.IDProducto ? 1 : 0;
  return total !== undefined ? returned + " de " + total : String(returned);
}
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

async function measure(label, pathFor, token, binary = false) {
  const times = [];
  let rows = "", statusFailures = 0;
  for (let i = 0; i < warmups + runs; i++) {
    const t0 = performance.now();
    const r = await get(typeof pathFor === "function" ? pathFor(i) : pathFor, token);
    let info;
    if (binary) info = Math.round((await r.arrayBuffer()).byteLength / 1024) + " KB";
    else info = rowsOf(await r.json());
    const ms = performance.now() - t0;
    if (r.status !== 200) { statusFailures++; rows = "HTTP " + r.status; continue; }
    if (i >= warmups) times.push(ms);
    rows = info;
  }
  times.sort((a, b) => a - b);
  if (times.length === 0) return { label, rows, p50: NaN, p95: NaN, max: NaN, ok: "No", statusFailures };
  return { label, rows, p50: pct(times, 50), p95: pct(times, 95), max: times[times.length - 1], ok: pct(times, 95) < 1000 && times[times.length - 1] < 1000 ? "Sí" : "No", statusFailures };
}

async function main() {
  const [admin, operador, cliente] = await Promise.all([login("admin@gmail.com"), login("operador@gmail.com"), login("cliente@gmail.com")]);
  const first = (await (await get("/catalogo/productos?tamanoPagina=1")).json()).items[0];
  const productId = first.IDProducto;
  const sample = Date.now();
  const results = [];
  const plan = [
    ["Catálogo público sin filtros", "/catalogo/productos", null],
    ["Catálogo público con filtros y orden", "/catalogo/productos?precioMin=50&precioMax=900&soloDisponibles=true&orden=PRECIO_DESC&tamanoPagina=24", null],
    ["Detalle de producto", "/catalogo/productos/" + productId, null],
    ["Carrito (cliente)", "/carrito", cliente],
    ["Mis pedidos (cliente)", "/pedidos", cliente],
    ["Pedidos admin con filtros y orden", "/pedidos?estado=PAGADO&totalMin=1&orden=total&direccion=desc&tamanoPagina=50", admin],
    ["Kardex (operador)", "/inventario/kardex?tamanoPagina=100", operador],
    ["Existencias bajas (operador)", "/inventario/existencias-bajas", operador],
    ["Cupones (admin)", "/cupones", admin],
    ["Usuarios (admin)", "/auth/usuarios?tamanoPagina=50", admin],
    ["Bitácora (admin)", "/bitacora?tamanoPagina=100", admin],
    ["Dashboard resumen en frío", (i) => "/dashboard/resumen?fechaInicio=" + new Date(Date.UTC(2000, 0, 1 + i + (sample % 3000))).toISOString().slice(0, 10), admin],
    ["Dashboard resumen en caché", "/dashboard/resumen?fechaInicio=2025-01-01", admin],
  ];
  for (const [label, p, token] of plan) results.push(await measure(label, p, token));
  results.push(await measure("Exportación a Excel (admin)", "/dashboard/exportar-excel", admin, true));

  const counts = {};
  for (const [name, p, token] of [["Productos", "/catalogo/productos?tamanoPagina=1", null], ["Pedidos", "/pedidos?tamanoPagina=1", admin], ["Usuarios", "/auth/usuarios?tamanoPagina=1", admin], ["Movimientos de kardex", "/inventario/kardex?tamanoPagina=1", admin], ["Bitácora", "/bitacora?tamanoPagina=1", admin]]) {
    const d = await (await get(p, token)).json();
    counts[name] = d.totalRegistros ?? d.total;
  }
  counts["Cupones"] = (await (await get("/cupones", admin)).json()).datos.length;

  const fmt = (n) => (Number.isNaN(n) ? "-" : n.toFixed(1));
  const lines = [
    "# Rendimiento de la API",
    "",
    "- Fecha: " + new Date().toISOString(),
    "- Equipo: " + os.cpus()[0].model.trim() + " (" + os.cpus().length + " hilos), " + (os.totalmem() / 2 ** 30).toFixed(1) + " GB de RAM, " + os.platform() + " " + os.release(),
    "- Node: " + process.version,
    "- API: " + api + " (" + warmups + " calentamientos y " + runs + " mediciones por endpoint, una petición a la vez)",
    "- Datos: " + Object.entries(counts).map(([k, v]) => k + " " + v).join(", "),
    "",
    "| Endpoint | Filas devueltas | p50 ms | p95 ms | Máx ms | < 1 s |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...results.map((r) => "| " + r.label + " | " + r.rows + " | " + fmt(r.p50) + " | " + fmt(r.p95) + " | " + fmt(r.max) + " | " + r.ok + " |"),
    "",
  ];
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, lines.join("\n"));
  console.log(lines.join("\n"));
  assert.equal(results.reduce((s, r) => s + r.statusFailures, 0), 0, "hubo respuestas distintas de 200");
}
main().catch((e) => { console.error(e); process.exit(1); });
