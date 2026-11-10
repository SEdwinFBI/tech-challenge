import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const habilitado = process.env.RUN_AUDIT_INTEGRATION === '1' && Boolean(process.env.AUDIT_API_URL) && Boolean(process.env.AUDIT_PASSWORD);
const base = process.env.AUDIT_API_URL ?? '';

async function llamar(metodo: string, ruta: string, token: string | null, cuerpo?: unknown) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
}

describe('Pagos: el monto autorizado coincide con el total del pedido', { skip: !habilitado }, () => {
  it('con cupón aplicado, IntentosPago.Monto es igual a Pedidos.Total', async () => {
    const password = process.env.AUDIT_PASSWORD!;
    const correo = process.env.AUDIT_CLIENT_EMAIL ?? 'cliente@gmail.com';
    const cliente = (await llamar('POST', '/auth/login', null, { correo, password })).body.accessToken as string;
    const admin = (await llamar('POST', '/auth/login', null, { correo: 'admin@gmail.com', password })).body.accessToken as string;

    const codigo = `PAGO${Date.now().toString(36).toUpperCase()}`;
    const crear = await llamar('POST', '/cupones', admin, {
      codigo,
      tipoDescuento: 'PORCENTAJE',
      valor: 10,
      montoMinimoCompra: 0,
      limiteTotalUsos: 5,
      limiteUsosPorCliente: 1,
      fechaInicio: new Date(Date.now() - 86_400_000).toISOString(),
      fechaFin: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.ok(crear.status === 200 || crear.status === 201, JSON.stringify(crear.body));

    const direccion = (await llamar('GET', '/checkout/direcciones', cliente)).body.datos[0].IDDireccion as number;
    const producto = (await llamar('GET', '/catalogo/productos?tamanoPagina=1', cliente)).body.items[0].IDProducto as number;
    const idVariante = (await llamar('GET', `/catalogo/productos/${producto}`, cliente)).body.variantes[0].IDVariante as number;

    await llamar('POST', '/carrito/items', cliente, { idVariante, cantidad: 1 });
    const aplicado = await llamar('POST', '/cupones/aplicar', cliente, { codigo });
    assert.equal(aplicado.status, 200, JSON.stringify(aplicado.body));
    const idCarrito = (await llamar('GET', '/carrito', cliente)).body.resumen.IDCarrito as number;
    assert.equal((await llamar('POST', '/checkout/reservar', cliente, { idCarrito })).status, 200);

    const clave = `pago-cupon-${Date.now()}`;
    const confirmar = await llamar('POST', '/checkout/confirmar', cliente, { idCarrito, idDireccion: direccion, claveIdempotencia: clave });
    assert.equal(confirmar.status, 201, JSON.stringify(confirmar.body));

    const pedido = (await llamar('GET', `/pedidos/${confirmar.body.IDPedido}`, cliente)).body.pedido;
    assert.ok(Number(pedido.Descuento) > 0, 'el pedido debe incluir descuento');
    const pagos = (await llamar('GET', '/checkout/pagos?pagina=1&tamanoPagina=50', admin)).body.datos as any[];
    const intento = pagos.find(p => p.ClaveIdempotencia === clave);
    assert.ok(intento, 'debe existir el intento de pago');
    assert.equal(intento.Estado, 'CAPTURADO');
    assert.equal(Number(intento.Monto), Number(pedido.Total));
  });
});
