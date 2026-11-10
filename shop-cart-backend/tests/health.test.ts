import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { crearHealthRouter } from '@/core/http/health.routes';

async function conServidor(router: express.Router, fn: (url: string) => Promise<void>) {
  const app = express();
  app.use('/health', router);
  const server = app.listen(0);
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}/health`);
  } finally {
    server.close();
  }
}

test('GET /health responde ok sin consultar dependencias', async () => {
  const router = crearHealthRouter({
    instancia: 'api-test',
    verificaciones: () => {
      throw new Error('no debe consultarse');
    },
  });
  await conServidor(router, async (url) => {
    const res = await fetch(url);
    const cuerpo = (await res.json()) as { ok: boolean; service: string };
    assert.equal(res.status, 200);
    assert.equal(cuerpo.ok, true);
    assert.equal(cuerpo.service, 'ShopCart API');
  });
});

test('GET /health/listo responde 200 con todas las dependencias sanas', async () => {
  const router = crearHealthRouter({
    instancia: 'api-test',
    verificaciones: () => ({ sql: async () => undefined, redis: async () => 'PONG' }),
  });
  await conServidor(router, async (url) => {
    const res = await fetch(`${url}/listo`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, instancia: 'api-test', sql: 'ok', redis: 'ok' });
  });
});

test('GET /health/listo responde 503 y marca la dependencia que falla', async () => {
  const router = crearHealthRouter({
    instancia: 'api-test',
    verificaciones: () => ({
      sql: async () => undefined,
      redis: async () => {
        throw new Error('sin conexión');
      },
    }),
  });
  await conServidor(router, async (url) => {
    const res = await fetch(`${url}/listo`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false, instancia: 'api-test', sql: 'ok', redis: 'error' });
  });
});

test('GET /health/listo omite redis cuando no está configurado', async () => {
  const router = crearHealthRouter({ instancia: 'api-test', verificaciones: () => ({ sql: async () => undefined }) });
  await conServidor(router, async (url) => {
    const res = await fetch(`${url}/listo`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, instancia: 'api-test', sql: 'ok' });
  });
});
