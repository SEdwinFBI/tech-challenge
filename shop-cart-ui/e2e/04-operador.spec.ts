import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { USERS, login } from './helpers';
import { filtrarColumna } from './flows2';

function pedidoDeLaCompra() {
  try {
    return (JSON.parse(readFileSync('test-results/ultimo-pedido.json', 'utf8')) as { codigo: string }).codigo;
  } catch {
    return null;
  }
}

test('operador: filtra pedidos, avanza estados y revisa inventario', async ({ page }) => {
  await login(page, USERS.operador);
  await page.goto('/admin/pedidos');
  await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();

  await filtrarColumna(page, 'Estado', 'Pagado');
  const filas = page.getByRole('row').filter({ hasText: /ORD-\d+/ });
  await expect(filas.first()).toBeVisible();
  await expect(filas.filter({ hasNotText: 'Pagado' })).toHaveCount(0);

  const codigo = pedidoDeLaCompra();
  const propia = codigo ? filas.filter({ hasText: codigo }) : filas.filter({ hasText: USERS.cliente });
  const fila = (await propia.count()) > 0 ? propia.first() : filas.filter({ hasText: USERS.cliente }).first();
  await fila.getByRole('link', { name: 'Gestionar' }).click();
  await expect(page).toHaveURL(/\/admin\/pedidos\/\d+/);
  const idPedido = page.url().match(/\/pedidos\/(\d+)/)![1];
  await expect(page.getByRole('heading', { level: 1, name: /^Pedido ORD-/ })).toBeVisible();

  const acciones = page.getByRole('heading', { name: 'Cambiar estado' }).locator('xpath=..');
  await expect(acciones.getByRole('button', { name: 'En preparación' })).toBeVisible();
  await expect(acciones.getByRole('button', { name: 'Cancelado' })).toBeVisible();
  await expect(acciones.getByRole('button', { name: 'Despachado' })).toHaveCount(0);
  await expect(acciones.getByRole('button', { name: 'Entregado' })).toHaveCount(0);

  const confirmar = async (destino: string) => {
    await acciones.getByRole('button', { name: destino, exact: true }).click();
    const dialogo = page.getByRole('dialog').filter({ hasText: `Cambiar a ${destino}` });
    await dialogo.getByRole('button', { name: 'Confirmar' }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByRole('listitem').filter({ hasText: destino }).first()).toBeVisible();
  };

  await confirmar('En preparación');
  await expect(acciones.getByRole('button', { name: 'Despachado' })).toBeVisible();
  await expect(acciones.getByRole('button', { name: 'Entregado' })).toHaveCount(0);
  await expect(acciones.getByRole('button', { name: 'En preparación' })).toHaveCount(0);

  await confirmar('Despachado');
  await expect(acciones.getByRole('button', { name: 'Entregado' })).toBeVisible();
  await expect(acciones.getByRole('button', { name: 'Cancelado' })).toHaveCount(0);

  await confirmar('Entregado');
  await expect(acciones.getByRole('button', { name: 'Devolución parcial' })).toBeVisible();
  await expect(acciones.getByRole('button', { name: 'Cancelado' })).toHaveCount(0);
  await expect(acciones.getByRole('button', { name: 'Despachado' })).toHaveCount(0);

  await page.goto('/admin/inventario');
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: `Salida por venta en Pedido #${idPedido}` })).toBeVisible();

  await page.getByRole('tab', { name: /Existencias bajas/ }).click();
  await expect(page.getByText(/Variantes activas con existencia disponible/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reabastecer' }).first()).toBeVisible();
});
