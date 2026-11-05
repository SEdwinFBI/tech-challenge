import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { compraCompleta } from './flows';

test('cliente: catálogo, carrito, cupón, checkout y pedido pagado', async ({ page, request }) => {
  const codigo = await compraCompleta(page, request);
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/ultimo-pedido.json', JSON.stringify({ codigo }));
});
