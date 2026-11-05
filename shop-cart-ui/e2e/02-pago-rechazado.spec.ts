import { expect, test } from '@playwright/test';
import { USERS, apiToken, clearCart, login } from './helpers';
import { agregarCamisaAlCarrito } from './flows2';

test('cliente: pago rechazado no crea pedido y el reintento aprobado crea uno solo', async ({ page, request }) => {
  const token = await apiToken(request, USERS.cliente);
  await clearCart(request, token);
  const contarPedidos = async () => {
    const res = await request.get('/api/v1/pedidos?tamanoPagina=100', { headers: { Authorization: `Bearer ${token}` } });
    const cuerpo = await res.json();
    return (cuerpo.datos as unknown[]).length;
  };
  const antes = await contarPedidos();

  await login(page, USERS.cliente);
  await agregarCamisaAlCarrito(page);
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Continuar al pago' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pago' })).toBeVisible();

  const simulacion = page.getByLabel('Modo de prueba: simular pago');
  await simulacion.selectOption({ label: 'Rechazado' });
  await page.getByRole('button', { name: /^Finalizar compra/ }).click();
  await expect(page.getByText('El pago fue rechazado. No se hizo ningún cobro.')).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);
  expect(await contarPedidos()).toBe(antes);

  await simulacion.selectOption({ label: 'Aprobado' });
  await page.getByRole('button', { name: /^Finalizar compra/ }).click();
  await expect(page).toHaveURL(/\/pedido\/\d+\/confirmado/);
  await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
  expect(await contarPedidos()).toBe(antes + 1);
});
