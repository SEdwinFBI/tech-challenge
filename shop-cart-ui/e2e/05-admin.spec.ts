import { expect, test } from '@playwright/test';
import { USERS, login, uniqueCode } from './helpers';
import { filtrarColumna } from './flows2';

test('admin: catálogo, cupones, usuarios, bitácora, dashboard, pagos y exportación', async ({ page }) => {
  const sufijo = uniqueCode('');
  const nombre = `Producto E2E ${sufijo}`;
  const sku = `E2E-${sufijo}`;
  const cupon = uniqueCode('CUP');

  await login(page, USERS.admin);

  await page.goto('/admin/catalogo');
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  const formulario = page.getByRole('dialog', { name: 'Nuevo producto' });
  await formulario.getByLabel('Nombre *').fill(nombre);
  await formulario.getByLabel('SKU único *').fill(sku);
  await formulario.getByLabel('Precio (Q) *').fill('99.50');
  await formulario.getByLabel('Existencia inicial').fill('7');
  const [respuesta] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/catalogo/productos') && r.request().method() === 'POST'),
    formulario.getByRole('button', { name: 'Crear' }).click(),
  ]);
  expect(respuesta.status(), await respuesta.text()).toBe(201);
  await expect(page.getByText('Producto creado')).toBeVisible();

  const fila = page.getByRole('row').filter({ hasText: nombre });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: /Editar/ }).click();
  const editor = page.getByRole('dialog', { name: nombre });
  await editor.getByRole('tab', { name: /^Variantes/ }).click();
  const precio = editor.getByRole('textbox', { name: `Precio de ${sku}` });
  await expect(precio).toHaveValue('99.5');
  await precio.fill('149.90');
  await editor.getByRole('button', { name: 'Guardar' }).click();
  await page.getByRole('button', { name: 'Cambiar', exact: true }).click();
  await expect(editor.getByRole('button', { name: 'Guardar' })).toHaveCount(0);
  await expect(precio).toHaveValue(/^149[.]9/);
  await editor.getByRole('button', { name: 'Cerrar' }).click();

  await page.goto(`/catalogo?q=${encodeURIComponent(nombre)}`);
  const tarjeta = page.getByRole('article').filter({ hasText: nombre });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toContainText(/149\D?90/);

  await page.goto('/admin/cupones');
  await page.getByRole('button', { name: 'Nuevo cupón' }).click();
  const dialogoCupon = page.getByRole('dialog', { name: 'Nuevo cupón' });
  await dialogoCupon.getByLabel('Código').fill(cupon);
  await dialogoCupon.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('row').filter({ hasText: cupon })).toBeVisible();

  await page.goto('/admin/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible();
  await filtrarColumna(page, 'Rol', 'Operador');
  const usuarios = page.getByRole('row').filter({ hasText: '@' });
  await expect(usuarios.first()).toBeVisible();
  await expect(usuarios.filter({ hasText: USERS.operador })).toBeVisible();
  await expect(usuarios.filter({ hasText: USERS.cliente })).toHaveCount(0);
  await expect(usuarios.filter({ hasText: USERS.admin })).toHaveCount(0);

  await page.goto('/admin/bitacora');
  const filaAuditoria = page.getByRole('row').filter({ hasText: 'PRODUCTOS' }).filter({ hasText: 'CREACION' }).first();
  await expect(filaAuditoria).toContainText(USERS.admin);
  await filaAuditoria.getByRole('button', { name: 'Ver cambios' }).click();
  await expect(page.getByRole('dialog')).toContainText(sku);
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).last().click();

  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ventas en quetzales' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ventas netas por categoría' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Los 10 productos más vendidos' })).toBeVisible();
  await page.getByRole('button', { name: 'Año' }).click();
  await expect(page.getByRole('button', { name: 'Año' })).toHaveAttribute('aria-pressed', 'true');
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);

  await page.goto('/admin/pagos');
  await expect(page.getByRole('heading', { level: 1, name: 'Pagos' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'SIM-' }).first()).toBeVisible();
});
