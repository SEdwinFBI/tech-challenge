import { test } from '@playwright/test';
import { compraCompleta } from './flows';

test('móvil 390x844: flujo de compra completo', async ({ page, request }) => {
  await compraCompleta(page, request);
});
