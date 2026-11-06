import { expect, test } from '@playwright/test';
import type { ProductListItem } from '../src/shared/types/domain';

const recommended: ProductListItem = { IDProducto: 13, Nombre: 'Camisa de cuadros azul y negro', Descripcion: 'Camisa de manga larga con cuadros.',
  Activo: true, IDCategoria: 2, Categoria: 'Camisas y Blusas', PrecioMinimo: 185, PrecioMaximo: 185, StockTotalDisponible: 12 };
const normal: ProductListItem = { ...recommended, IDProducto: 2, Nombre: 'Camisa Oxford Clásica' };

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`buscador ${viewport.width}: recomienda mientras se escribe sin presionar Enter`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/v1/catalogo/productos?**', route => route.fulfill({ json: { ok: true, items: [], totalRegistros: 0 } }));
    await page.route('**/api/v1/recomendaciones/busqueda?**', async route => {
      await ready;
      await route.fulfill({ json: { ok: true, item: recommended } });
    });
    await page.goto('/catalogo');
    const input = page.getByRole('searchbox', { name: 'Buscar en la tienda' });
    await input.fill('cuadros cmsa');
    const panel = page.getByRole('region', { name: 'Sugerencias de búsqueda' });
    await expect(panel.getByText('Buscando una recomendación…')).toBeVisible();
    await expect(panel.getByText('Sin coincidencias exactas para “cuadros cmsa”.')).toBeVisible();
    release();
    const ai = panel.getByRole('region', { name: 'Recomendado por la IA' });
    await expect(ai.getByRole('button')).toHaveCount(1);
    await expect(ai.getByRole('button', { name: `Ver recomendación: ${recommended.Nombre}` })).toBeVisible();
    await expect(page).toHaveURL(/\/catalogo$/);
    await ai.getByRole('button').click();
    await expect(page).toHaveURL('/producto/13');
    await expect(panel).toHaveCount(0);
  });
}

test('buscador separa resultados normales y oculta una recomendacion duplicada', async ({ page }) => {
  let duplicate = false;
  await page.route('**/api/v1/catalogo/productos?**', route => route.fulfill({ json: { ok: true, items: [normal], totalRegistros: 1 } }));
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: { ok: true, item: duplicate ? normal : recommended } }));
  await page.goto('/catalogo');
  const input = page.getByRole('searchbox', { name: 'Buscar en la tienda' });
  await input.fill('camisa');
  const panel = page.getByRole('region', { name: 'Sugerencias de búsqueda' });
  await expect(panel.getByRole('list', { name: 'Resultados de búsqueda' }).getByRole('button', { name: normal.Nombre })).toBeVisible();
  await expect(panel.getByRole('button', { name: `Ver recomendación: ${recommended.Nombre}` })).toBeVisible();
  duplicate = true;
  const response = page.waitForResponse(r => r.url().includes('/recomendaciones/busqueda?') && new URL(r.url()).searchParams.get('q') === 'oxford');
  await input.fill('oxford');
  await response;
  await expect(panel.getByRole('region', { name: 'Recomendado por la IA' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: normal.Nombre })).toBeVisible();
});

test('buscador descarta sugerencias anteriores y permite cerrar y enviar la consulta', async ({ page }) => {
  await page.route('**/api/v1/catalogo/productos?**', route => route.fulfill({ json: { ok: true, items: [], totalRegistros: 0 } }));
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: {
    ok: true, item: new URL(route.request().url()).searchParams.get('q') === 'cuadros cmsa' ? recommended : null,
  } }));
  await page.goto('/catalogo');
  const input = page.getByRole('searchbox', { name: 'Buscar en la tienda' });
  await input.fill('cuadros cmsa');
  const panel = page.getByRole('region', { name: 'Sugerencias de búsqueda' });
  await expect(panel.getByRole('button', { name: `Ver recomendación: ${recommended.Nombre}` })).toBeVisible();
  await input.fill('auriculares');
  await expect(panel.getByRole('button', { name: `Ver recomendación: ${recommended.Nombre}` })).toHaveCount(0);
  await input.press('Escape');
  await expect(panel).toHaveCount(0);
  await input.fill('cuadros cmsa');
  await expect(panel).toBeVisible();
  await input.press('Enter');
  await expect(page).toHaveURL(/\/catalogo\?q=cuadros%20cmsa/);
  await expect(panel).toHaveCount(0);
});
