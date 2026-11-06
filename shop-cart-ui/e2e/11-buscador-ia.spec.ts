import { expect, test } from '@playwright/test';
import type { ProductListItem } from '../src/shared/types/domain';
import { searchInput } from './helpers';

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
    const input = await searchInput(page);
    await input.fill('cuadros cmsa');
    const list = page.getByRole('listbox', { name: 'Sugerencias de búsqueda' });
    await expect(list).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByText('Sin resultados para “cuadros cmsa”')).toBeVisible();
    release();
    const ai = list.getByRole('option', { name: new RegExp(`${recommended.Nombre}.*Sugerido`) });
    await expect(ai).toHaveCount(1);
    await expect(ai).toBeVisible();
    await expect(page).toHaveURL(/\/catalogo$/);
    await ai.click();
    await expect(page).toHaveURL(/\/producto\/13-[a-z0-9-]+$/);
    await expect(list).toHaveCount(0);
  });
}

test('buscador separa resultados normales y oculta una recomendacion duplicada', async ({ page }) => {
  let duplicate = false;
  await page.route('**/api/v1/catalogo/productos?**', route => route.fulfill({ json: { ok: true, items: [normal], totalRegistros: 1 } }));
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: { ok: true, item: duplicate ? normal : recommended } }));
  await page.goto('/catalogo');
  const input = await searchInput(page);
  await input.fill('camisa');
  const list = page.getByRole('listbox', { name: 'Sugerencias de búsqueda' });
  await expect(list.getByRole('option', { name: new RegExp(`^${normal.Nombre}`) })).toBeVisible();
  await expect(list.getByRole('option', { name: new RegExp(`${recommended.Nombre}.*Sugerido`) })).toBeVisible();
  duplicate = true;
  const response = page.waitForResponse(r => r.url().includes('/recomendaciones/busqueda?') && new URL(r.url()).searchParams.get('q') === 'oxford');
  await input.fill('oxford');
  await response;
  await expect(list.getByRole('option', { name: /Sugerido/ })).toHaveCount(0);
  await expect(list.getByRole('option', { name: new RegExp(`^${normal.Nombre}`) })).toBeVisible();
});

test('buscador descarta sugerencias anteriores y permite cerrar y enviar la consulta', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/api/v1/catalogo/productos?**', route => route.fulfill({ json: { ok: true, items: [], totalRegistros: 0 } }));
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: {
    ok: true, item: new URL(route.request().url()).searchParams.get('q') === 'cuadros cmsa' ? recommended : null,
  } }));
  await page.goto('/catalogo');
  const input = await searchInput(page);
  await input.fill('cuadros cmsa');
  const list = page.getByRole('listbox', { name: 'Sugerencias de búsqueda' });
  const ai = list.getByRole('option', { name: new RegExp(`${recommended.Nombre}.*Sugerido`) });
  await expect(ai).toBeVisible();
  await input.fill('auriculares');
  await expect(ai).toHaveCount(0);
  await input.press('Escape');
  await expect(list).toHaveCount(0);
  await input.fill('cuadros cmsa');
  await expect(list).toBeVisible();
  await input.press('Enter');
  await expect(page).toHaveURL(/\/catalogo\?q=cuadros%20cmsa/);
  await expect(list).toHaveCount(0);
});

test('buscador: teclado, historial y cierre al hacer clic fuera', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/api/v1/catalogo/productos?**', route => route.fulfill({ json: { ok: true, items: [normal], totalRegistros: 1 } }));
  await page.route('**/api/v1/recomendaciones/busqueda?**', route => route.fulfill({ json: { ok: true, item: null } }));
  await page.goto('/catalogo');
  const input = await searchInput(page);
  await input.fill('camisa');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option', { name: new RegExp(`^${normal.Nombre}`) })).toBeVisible();
  await input.press('ArrowDown');
  await expect(page.getByRole('option', { name: new RegExp(`^${normal.Nombre}`) })).toHaveAttribute('aria-selected', 'true');
  await expect(input).toHaveAttribute('aria-activedescendant', /.+/);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/producto\/2-[a-z0-9-]+$/);
  await page.goto('/catalogo');
  await input.click();
  await expect(page.getByRole('option', { name: 'camisa' })).toBeVisible();
  await page.getByRole('heading', { name: 'Filtros' }).click();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});
