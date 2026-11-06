import { expect, test } from '@playwright/test';
import { USERS, apiToken, login } from './helpers';

test('seguridad: cliente no entra al panel ni lee pedidos ajenos', async ({ page, request }) => {
  await login(page, USERS.cliente);
  for (const ruta of ['/admin/dashboard', '/admin/usuarios', '/admin/pedidos']) {
    await page.goto(ruta);
    await expect(page.getByRole('heading', { name: /acceso|permiso|prohibido|no autorizado/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toHaveCount(0);
  }

  const token = await apiToken(request, USERS.cliente);
  const headers = { Authorization: `Bearer ${token}` };
  const propios = await (await request.get('/api/v1/pedidos?tamanoPagina=100', { headers })).json();
  const idsPropios = new Set((propios.datos as { IDPedido: number }[]).map((p) => p.IDPedido));
  const ajeno = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11].find((id) => !idsPropios.has(id))!;
  const res = await request.get(`/api/v1/pedidos/${ajeno}`, { headers });
  expect([403, 404]).toContain(res.status());

  const cambio = await request.patch(`/api/v1/pedidos/${ajeno}/estado`, { headers, data: { nuevoEstado: 'CANCELADO', comentario: 'prueba de seguridad' } });
  expect([403, 404]).toContain(cambio.status());

  const cupones = await request.get('/api/v1/cupones', { headers });
  expect(cupones.status()).toBe(403);
});
