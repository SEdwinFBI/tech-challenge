import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { login, PASSWORD, USERS } from './helpers';

test('inicio, favoritos y ofertas presentan recomendaciones independientes', async ({ page, request }) => {
  const correo = `surfaces-${randomUUID()}@test.invalid`;
  expect((await request.post('/api/v1/auth/register', { data: { correo, password: PASSWORD, nombreCompleto: 'Prueba superficies' } })).status()).toBe(201);
  await login(page, correo);
  await page.goto('/');
  const home = page.getByRole('region', { name: 'Lo más vendido', exact: true }).first();
  await expect(home.locator('article')).toHaveCount(10);
  await page.goto('/producto/2');
  await page.getByRole('button', { name: 'Guardar en favoritos', exact: true }).first().click();
  await expect(page.getByText('Guardado en favoritos', { exact: true })).toBeVisible();
  await page.goto('/cuenta/favoritos');
  const favorites = page.getByRole('region', { name: 'Parecidos a tus favoritos' }).first();
  await expect(favorites.locator('article')).toHaveCount(10);
  await expect(favorites.locator('a[href="/producto/2"]')).toHaveCount(0);
  await page.goto('/ofertas');
  const offers = page.getByRole('region', { name: 'Ofertas para ti' }).first();
  await expect(offers.locator('article')).toHaveCount(10);
});

test('busqueda conserva resultados normales y muestra solo una alternativa distinta', async ({ page, request }) => {
  const normal = await (await request.get('/api/v1/catalogo/productos?q=camisa&tamanoPagina=50')).json();
  const normalIds = new Set(normal.items.map((p: { IDProducto: number }) => p.IDProducto));
  const all = await (await request.get('/api/v1/catalogo/productos?tamanoPagina=50&soloDisponibles=true')).json();
  const alternative = all.items.find((p: { IDProducto: number }) => !normalIds.has(p.IDProducto));
  expect(alternative).toBeTruthy();
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: { ok: true, item: alternative } }));
  await page.goto('/catalogo?q=camisa');
  const recommendation = page.getByRole('region', { name: 'Recomendado por la IA' });
  await expect(recommendation.locator('article')).toHaveCount(1);
  await expect(recommendation.locator(`a[href="/producto/${alternative.IDProducto}"]`).first()).toBeVisible();
  const normalCard = normal.items[0];
  await page.unroute('**/api/v1/recomendaciones/busqueda?**');
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: { ok: true, item: normalCard } }));
  const refreshed = page.waitForResponse(r => r.url().includes('/recomendaciones/busqueda?'));
  await page.reload();
  await refreshed;
  await expect(page.getByRole('heading', { name: /Resultados para/ })).toBeVisible();
  await expect(recommendation).toHaveCount(0);
});

test('revision administrativa aplica sugerencias al formulario y oculta respuestas obsoletas', async ({ page, request }) => {
  const categories = (await (await request.get('/api/v1/catalogo/categorias')).json()).datos;
  const suggested = categories.find((c: { Nombre: string }) => c.Nombre === 'Calzado');
  await login(page, USERS.admin);
  await page.route('**/api/v1/catalogo/revision', route => route.fulfill({ json: {
    ok: true, evaluacionDisponible: true, categoriaSugerida: suggested,
    posiblesDuplicados: [{ IDProducto: 1, Nombre: 'Botín de Cuero Artesanal', Categoria: 'Calzado' }],
  } }));
  let writes = 0;
  page.on('request', req => { if (req.url().includes('/catalogo/productos') && ['POST', 'PUT', 'DELETE'].includes(req.method())) writes++; });
  await page.goto('/admin/catalogo');
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo producto' });
  await form.getByLabel('Nombre *').fill('Botín de cuero nuevo');
  await form.getByRole('button', { name: 'Analizar producto' }).click();
  await expect(form.getByText('Posibles duplicados para revisar')).toBeVisible();
  await form.getByRole('button', { name: 'Usar categoría' }).click();
  await expect(form.getByLabel('Categoría *')).toHaveValue(String(suggested.IDCategoria));
  expect(writes).toBe(0);
  await form.getByLabel('Nombre *').fill('Un producto diferente');
  await expect(form.getByRole('button', { name: 'Usar categoría' })).toHaveCount(0);
});

test('las imagenes corregidas y las del catalogo adicional cargan en el navegador', async ({ page, request }) => {
  for (const name of ['Botín de Cuero Artesanal', 'Blusa Típica con Bordado de Cantel', 'Camisa de cuadros azul y negro']) {
    const response = await request.get(`/api/v1/catalogo/productos?q=${encodeURIComponent(name)}`);
    expect(response.ok()).toBeTruthy();
    const product = (await response.json()).items.find((p: { Nombre: string }) => p.Nombre === name);
    expect(product?.ImagenUrl).toMatch(/^https:\/\//);
    await page.goto(`/producto/${product.IDProducto}`);
    const image = page.locator('[aria-roledescription="galería"] img').first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
});
