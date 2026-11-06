import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { USERS, apiToken, clearCart, createCoupon, login, searchInput, uniqueCode } from './helpers';

const monto = (etiqueta: string, n: number | string, signo = '') =>
  new RegExp(`${etiqueta}\\s*${signo}Q\\s*${(typeof n === 'number' ? n.toFixed(2) : n).replace('.', '\\.')}`);

export async function compraCompleta(page: Page, request: APIRequestContext) {
  const clienteToken = await apiToken(request, USERS.cliente);
  await clearCart(request, clienteToken);
  const adminToken = await apiToken(request, USERS.admin);
  const cupon = uniqueCode('E2E');
  await createCoupon(request, adminToken, cupon);

  await login(page, USERS.cliente);

  await page.goto('/catalogo');
  const search = await searchInput(page);
  await search.fill('camisa');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: /Resultados para/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Camisa Oxford Clásica', exact: true })).toBeVisible();

  await page.goto('/catalogo');
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: 'Filtros', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Filtros' });
    await panel.getByRole('button', { name: /^Camisas y Blusas/ }).click();
    await panel.getByRole('button', { name: /^Ver \d+ producto/ }).click();
    await expect(panel).toBeHidden();
  } else {
    await page.getByRole('button', { name: /^Camisas y Blusas/ }).first().click();
  }
  await expect(page.getByRole('link', { name: 'Camisa Oxford Clásica', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tenis Urbanos de Lona y Cuero', exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Camisa Oxford Clásica', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Camisa Oxford Clásica' })).toBeVisible();
  await page.getByRole('button', { name: /^Agregar al carrito/ }).first().click();
  await expect(page.getByRole('link', { name: /Carrito, 1 producto/ }).first()).toBeVisible();

  await page.goto('/carrito');
  const resumen = page.getByRole('complementary', { name: 'Resumen del pedido' });
  await expect(resumen).toContainText(monto('Subtotal', 280));
  await expect(resumen).toContainText(monto('Envío', 25));
  await expect(resumen).toContainText(monto('Total estimado', 305));
  const base = (305 / 1.12).toFixed(2);
  const iva = (305 - 305 / 1.12).toFixed(2);
  await expect(resumen).toContainText(monto('Base imponible', base));
  await expect(resumen).toContainText(monto('IVA 12% incluido', iva));

  await page.getByRole('button', { name: 'Aplicar cupón' }).click();
  const campo = page.getByRole('textbox').last();
  await campo.fill(cupon);
  await campo.press('Enter');
  await expect(resumen).toContainText(cupon);
  await expect(resumen).toContainText(monto('Descuento', 50, '-'));
  const iva2 = (255 - 255 / 1.12).toFixed(2);
  await expect(resumen).toContainText(monto('IVA 12% incluido', iva2));

  await page.getByRole('button', { name: 'Continuar al pago' }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dirección de entrega' })).toBeVisible();
  const direccion = page.getByRole('radio').first();
  await direccion.check();
  await expect(direccion).toBeChecked();
  await page.getByRole('button', { name: 'Continuar al pago' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Pago' })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  const simulacion = page.getByLabel('Modo de prueba: simular pago');
  await simulacion.selectOption({ label: 'Aprobado' });
  await page.getByRole('button', { name: /^Finalizar compra/ }).click();

  await expect(page).toHaveURL(/\/pedido\/\d+\/confirmado/);
  await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
  const codigoPedido = (await page.getByText(/ORD-\d+/).first().textContent())!.match(/ORD-\d+/)![0];
  await expect(page.getByText('Pagado').first()).toBeVisible();

  await page.goto('/cuenta/pedidos');
  const fila = page.getByRole('listitem').filter({ hasText: codigoPedido });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText('Pagado');
  return codigoPedido;
}
