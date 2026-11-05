import { expect, test } from '@playwright/test';
import { USERS, apiToken, clearCart, login } from './helpers';

test('invitado: el carrito se conserva al iniciar sesión', async ({ page, request }) => {
  const token = await apiToken(request, USERS.cliente);
  await clearCart(request, token);

  await page.goto('/producto/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Camisa Oxford Clásica' })).toBeVisible();
  await page.getByRole('button', { name: /^Agregar al carrito/ }).first().click();
  await expect(page.getByRole('link', { name: /Carrito, 1 producto/ }).first()).toBeVisible();

  await page.goto('/carrito');
  await expect(page.getByRole('link', { name: 'Camisa Oxford Clásica' }).first()).toBeVisible();

  await login(page, USERS.cliente);
  await page.goto('/carrito');
  await expect(page.getByRole('link', { name: 'Camisa Oxford Clásica' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Carrito, 1 producto/ }).first()).toBeVisible();
});
