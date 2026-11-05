import { expect, test } from '@playwright/test';

test('sin conexión: aviso, botón Agregar deshabilitado y aviso al volver', async ({ page, context }) => {
  await page.goto('/catalogo');
  const agregar = page.getByRole('button', { name: 'Agregar', exact: true }).first();
  await expect(agregar).toBeEnabled();

  await context.setOffline(true);
  await expect(page.getByText('Sin conexión. Algunas acciones no están disponibles.')).toBeVisible();
  await expect(agregar).toBeDisabled();

  await context.setOffline(false);
  await expect(page.getByText('Conexión restablecida')).toBeVisible();
  await expect(page.getByText('Sin conexión. Algunas acciones no están disponibles.')).toBeHidden();
  await expect(agregar).toBeEnabled();
});
