import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const PASSWORD = process.env.AUDIT_PASSWORD ?? 'Admin123!';

export const USERS = {
  cliente: 'cliente@shopcart.gt',
  operador: 'operador@shopcart.gt',
  admin: 'admin@shopcart.gt',
} as const;

export async function login(page: Page, correo: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function apiToken(request: APIRequestContext, correo: string) {
  const res = await request.post('/api/v1/auth/login', { data: { correo, password: PASSWORD } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.accessToken as string;
}

export async function clearCart(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await request.get('/api/v1/carrito', { headers });
  const body = await res.json();
  for (const item of body.items ?? []) {
    const id = item.IDVariante ?? item.idVariante;
    await request.delete(`/api/v1/carrito/items/${id}`, { headers });
  }
  if (body.resumen?.CodigoCuponAplicado) {
    const removed = await request.delete('/api/v1/cupones/aplicar', { headers });
    expect(removed.ok()).toBeTruthy();
  }
}

export async function createCoupon(request: APIRequestContext, token: string, codigo: string, extra: Record<string, unknown> = {}) {
  const hoy = new Date();
  const inicio = new Date(hoy.getTime() - 24 * 3600 * 1000);
  const fin = new Date(hoy.getTime() + 30 * 24 * 3600 * 1000);
  const res = await request.post('/api/v1/cupones', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      codigo,
      tipoDescuento: 'MONTO_FIJO',
      valor: 50,
      montoMinimoCompra: 100,
      limiteTotalUsos: 100,
      limiteUsosPorCliente: 5,
      fechaInicio: inicio.toISOString(),
      fechaFin: fin.toISOString(),
      activo: true,
      ...extra,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

export function uniqueCode(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

export async function searchInput(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 768) await page.getByRole('button', { name: 'Abrir búsqueda' }).click();
  return page.getByRole('combobox', { name: 'Buscar en la tienda' });
}
