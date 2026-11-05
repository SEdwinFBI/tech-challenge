import { expect, type Page } from '@playwright/test';

export async function agregarCamisaAlCarrito(page: Page) {
  await page.goto('/producto/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Camisa Oxford Clásica' })).toBeVisible();
  await page.getByRole('button', { name: /^Agregar al carrito/ }).first().click();
  await expect(page.getByRole('link', { name: /Carrito, \d+ producto/ }).first()).toBeVisible();
}

export async function filtrarColumna(page: Page, columna: string, opcion: string) {
  await page.getByRole('button', { name: `Filtrar por ${columna}` }).click();
  const dialogo = page.getByRole('dialog', { name: /^Filtro de/ });
  await dialogo.getByRole('combobox').selectOption({ label: opcion });
  await dialogo.getByRole('button', { name: 'Listo' }).click();
  await expect(dialogo).toBeHidden();
}
