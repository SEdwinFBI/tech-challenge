import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ICache } from '@/core/cache/cache.interface';
import type { RecommendationContext } from '@/features/recomendaciones/models/recomendaciones.model';
import type { IRecommendationContextRepository } from '@/features/recomendaciones/abstracts/recommendation-context.repository.interface';
import { GetRecommendationsQueryHandler } from '@/features/recomendaciones/queries/get-recommendations.query';
import { JevClient } from '@/features/recomendaciones/infrastructure/jev.client';
import { JevScoreClient } from '@/core/ai/jev-score.client';
import { ReviewCatalogProductQueryHandler } from '@/features/catalogo/queries/review-catalog-product.query';
import { GetRecommendationsSchema, GetSearchRecommendationSchema } from '@/features/recomendaciones/models/recomendaciones.schema';
import { GetSearchRecommendationQueryHandler } from '@/features/recomendaciones/queries/get-search-recommendation.query';
import { JevSearchProductSelector } from '@/features/recomendaciones/infrastructure/jev-search-product.selector';

function fixture() {
  const context: RecommendationContext = {
    signals: [{ IDProducto: 90, IDCategoria: 1, Nombre: 'Zapatos', Categoria: 'Ropa', Tipo: 'FAVORITO', Peso: 3 }],
    candidates: Array.from({ length: 15 }, (_, i) => ({ IDProducto: i + 1, IDCategoria: 1, Nombre: `Articulo ${i + 1}`, Activo: true, StockTotalDisponible: 4 })),
  };
  const entries = new Map<string, unknown>();
  const cache: ICache = {
    get: async <T>(key: string) => (entries.get(key) as T | undefined) ?? null,
    set: async (key, data) => { entries.set(key, data); },
    clear: async () => { entries.clear(); },
  };
  const repo: IRecommendationContextRepository = { context: async () => structuredClone(context) };
  return { context, cache, repo };
}

describe('Recomendaciones personalizadas', () => {
  it('separa inicio, favoritos y ofertas en cache y filtra sus candidatos', async () => {
    const { context, repo, cache } = fixture();
    context.signals[0]!.IDProducto = 1;
    context.signals.push({ ...context.signals[0]!, IDProducto: 2, Tipo: 'VISTA' });
    context.candidates[2]!.PorcentajeDescuento = 20;
    const placements: string[] = [];
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async (ctx, placement) => {
      placements.push(placement);
      if (placement === 'favoritos') assert.ok(ctx.signals.every(s => s.Tipo === 'FAVORITO'));
      return null;
    } }, cache);
    const owner = { propietario: 'u:1' };
    assert.equal((await handler.handle(owner, undefined, 'inicio')).items.length, 10);
    assert.ok(!(await handler.handle(owner, undefined, 'favoritos')).items.some(p => p.IDProducto === 1));
    assert.deepEqual((await handler.handle(owner, undefined, 'ofertas')).items.map(p => p.IDProducto), [3]);
    assert.deepEqual(placements, ['inicio', 'favoritos', 'ofertas']);
    context.signals = [];
    assert.equal((await handler.handle(owner, undefined, 'favoritos')).items.length, 0);
  });

  it('valida contextos y rangos de precios fuera de los routers', () => {
    for (const contexto of ['inicio', 'favoritos', 'ofertas']) assert.ok(GetRecommendationsSchema.safeParse({ contexto }).success);
    assert.equal(GetRecommendationsSchema.safeParse({ contexto: 'inexistente' }).success, false);
    assert.equal(GetRecommendationsSchema.safeParse({ precioMin: 100, precioMax: 20 }).success, false);
    assert.equal(GetSearchRecommendationSchema.safeParse({ q: 'x' }).success, false);
    assert.equal(GetSearchRecommendationSchema.safeParse({ q: 'tenis', precioMin: 500, precioMax: 50 }).success, false);
  });
  it('devuelve diez productos segun Jev y reutiliza el resultado', async () => {
    const { repo, cache } = fixture();
    let calls = 0;
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => { calls++; return [15, 14, 13]; } }, cache);
    const owner = { propietario: 'u:1' };
    const result = await handler.handle(owner);
    assert.equal(result.items.length, 10);
    assert.deepEqual(result.items.slice(0, 3).map(p => p.IDProducto), [15, 14, 13]);
    assert.equal(result.origen, 'jev');
    assert.deepEqual(await handler.handle(owner), result);
    assert.equal(calls, 1);
  });

  it('excluye el producto actual, carrito, agotados, inactivos y duplicados', async () => {
    const { context, repo, cache } = fixture();
    context.signals.push({ ...context.signals[0]!, IDProducto: 2, Tipo: 'CARRITO', Peso: 4 });
    context.candidates[2]!.StockTotalDisponible = 0;
    context.candidates[3]!.Activo = false;
    context.candidates.push(context.candidates[4]!);
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => null }, cache);
    const result = await handler.handle({ propietario: 'u:1' }, 1);
    const ids = result.items.map(p => p.IDProducto);
    assert.equal(result.origen, 'preferencias');
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, ids.length);
    for (const excluded of [1, 2, 3, 4]) assert.ok(!ids.includes(excluded));
  });

  it('recalcula al cambiar favoritos, carrito, propietario o contexto', async () => {
    const { context, repo, cache } = fixture();
    let calls = 0;
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => { calls++; return null; } }, cache);
    const owner = { propietario: 'u:1' };
    await handler.handle(owner);
    context.signals = [];
    await handler.handle(owner);
    context.signals.push({ IDProducto: 2, IDCategoria: 1, Nombre: 'P2', Categoria: 'Ropa', Tipo: 'CARRITO', Peso: 4 });
    await handler.handle(owner);
    await handler.handle(owner, undefined, 'carrito');
    await handler.handle({ propietario: 'u:2' });
    assert.equal(calls, 5);
  });

  it('comparte una llamada entre solicitudes simultaneas del mismo perfil', async () => {
    const { repo, cache } = fixture();
    let calls = 0;
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return null;
    } }, cache);
    await Promise.all(Array.from({ length: 10 }, () => handler.handle({ propietario: 'u:1' })));
    assert.equal(calls, 1);
  });

  it('ordena puntuaciones validas y envia solo datos de productos y preferencias', async () => {
    const { context } = fixture();
    const request: typeof fetch = async (_url, init) => {
      const body = JSON.parse(init!.body as string);
      assert.equal(typeof body.state, 'string');
      assert.ok(!body.state.includes('propietario'));
      assert.ok(!body.state.includes('correo'));
      assert.equal(Object.keys(body.questions).length, 15);
      assert.ok(init!.signal);
      return Response.json({ answers: Object.fromEntries(context.candidates.map(p => [`p${p.IDProducto}`, { score: p.IDProducto / 15 * 2 }])) });
    };
    const ranker = new JevClient(new JevScoreClient('test-key', 'test-model', 2000, request));
    const ids = await ranker.rank(context, 'carrito');
    assert.equal(ids?.[0], 15);
    assert.equal(ids?.[14], 1);
  });

  it('respalda errores, respuestas incompletas y puntuaciones invalidas sin reintentos continuos', async () => {
    for (const failure of ['network', 'timeout', 'http', 'missing', 'score']) {
      const { context } = fixture();
      let calls = 0;
      const request: typeof fetch = async () => {
        calls++;
        if (failure === 'network') throw new Error('offline');
        if (failure === 'timeout') throw new DOMException('Timeout', 'TimeoutError');
        if (failure === 'http') return new Response('', { status: 429 });
        return Response.json({ answers: failure === 'missing' ? {} : { p1: { score: 3 } } });
      };
      const ranker = new JevClient(new JevScoreClient('test-key', 'test-model', 2000, request));
      assert.equal(await ranker.rank(context, 'producto'), null);
      assert.equal(await ranker.rank(context, 'producto'), null);
      assert.equal(calls, 1);
    }
  });

  it('no consume la API sin clave o sin preferencias', async () => {
    const { context } = fixture();
    const request: typeof fetch = async () => { throw new Error('No debe llamarse'); };
    assert.equal(await new JevClient(new JevScoreClient('', 'test-model', 2000, request)).rank(context, 'producto'), null);
    context.signals = [];
    assert.equal(await new JevClient(new JevScoreClient('test-key', 'test-model', 2000, request)).rank(context, 'producto'), null);
  });
});

describe('Revision del catalogo', () => {
  const context = {
    categories: [{ IDCategoria: 1, Nombre: 'Calzado' }, { IDCategoria: 2, Nombre: 'Camisas' }],
    products: [{ IDProducto: 10, Nombre: 'Camisa azul', Categoria: 'Camisas' }, { IDProducto: 11, Nombre: 'Camisa blanca', Categoria: 'Camisas' }],
  };

  it('sugiere categorias existentes y duplicados fuertes sin mutar el catalogo', async () => {
    const handler = new ReviewCatalogProductQueryHandler({ context: async () => structuredClone(context) }, {
      score: async () => ({ c1: 0.1, c2: 1.95, p10: 1.9, p11: 1.2 }),
    });
    const result = await handler.handle({ nombre: 'Camisa azul' });
    assert.deepEqual(result.categoriaSugerida, { IDCategoria: 2, Nombre: 'Camisas' });
    assert.deepEqual(result.posiblesDuplicados.map(p => p.IDProducto), [10]);
    assert.equal(result.evaluacionDisponible, true);
    assert.equal(context.products.length, 2);
  });

  it('excluye el propio producto y descarta categorias ambiguas', async () => {
    const handler = new ReviewCatalogProductQueryHandler({ context: async () => structuredClone(context) }, {
      score: async (_state, questions) => { assert.ok(!questions.p10); return { c1: 1, c2: 1.1, p11: 1 }; },
    });
    const result = await handler.handle({ nombre: 'Camisa azul', idProducto: 10 });
    assert.equal(result.categoriaSugerida, null);
    assert.deepEqual(result.posiblesDuplicados, []);
  });

  it('ante una caida solo devuelve coincidencias exactas de nombre', async () => {
    const handler = new ReviewCatalogProductQueryHandler({ context: async () => structuredClone(context) }, { score: async () => null });
    const result = await handler.handle({ nombre: ' CÁMISA AZUL ' });
    assert.equal(result.evaluacionDisponible, false);
    assert.equal(result.categoriaSugerida, null);
    assert.deepEqual(result.posiblesDuplicados.map(p => p.IDProducto), [10]);
  });
});

describe('Producto recomendado en la busqueda', () => {
  it('envia como maximo veinte candidatos y devuelve un solo producto', async () => {
    const { context, cache } = fixture();
    const candidates = Array.from({ length: 40 }, (_, i) => ({ ...context.candidates[0]!, IDProducto: i + 1 }));
    let calls = 0;
    const handler = new GetSearchRecommendationQueryHandler({ candidates: async () => candidates }, {
      select: async (query, selected) => { calls++; assert.equal(query, 'camisa azul'); assert.equal(selected.length, 20); return selected[19]!; },
    }, cache);
    assert.equal((await handler.handle({ q: 'camisa azul' })).item?.IDProducto, 20);
    assert.equal((await handler.handle({ q: 'camisa azul' })).item?.IDProducto, 20);
    assert.equal(calls, 1);
  });

  it('no presenta recomendaciones con poca relevancia ni al fallar el proveedor', async () => {
    const { context } = fixture();
    const low = new JevSearchProductSelector({ score: async () => Object.fromEntries(context.candidates.map(p => [`p${p.IDProducto}`, 1.6])) });
    assert.equal(await low.select('camisa azul', context.candidates), null);
    const offline = new JevSearchProductSelector({ score: async () => null });
    assert.equal(await offline.select('camisa azul', context.candidates), null);
    const good = new JevSearchProductSelector({ score: async () => Object.fromEntries(context.candidates.map(p => [`p${p.IDProducto}`, p.IDProducto === 7 ? 1.95 : 0.2])) });
    assert.equal((await good.select('camisa azul', context.candidates))?.IDProducto, 7);
  });

  it('no acepta productos ajenos a la lista filtrada por SQL', async () => {
    const { context, cache } = fixture();
    const handler = new GetSearchRecommendationQueryHandler({ candidates: async () => context.candidates }, {
      select: async () => ({ ...context.candidates[0]!, IDProducto: 9000 }),
    }, cache);
    assert.equal((await handler.handle({ q: 'camisa' })).item, null);
  });
});
