import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ICache } from '@/core/cache/cache.interface';
import type { RecommendationContext } from '@/features/recomendaciones/models/recomendaciones.model';
import type { IRecommendationsRepository } from '@/features/recomendaciones/abstracts/recomendaciones.repository.interface';
import { GetRecommendationsQueryHandler } from '@/features/recomendaciones/queries/get-recommendations.query';
import { JevRecommendationRanker } from '@/features/recomendaciones/infrastructure/jev-recommendation.ranker';
import { JevScoreClient } from '@/core/ai/jev-score.client';
import { AiBudget, BudgetedScoreClient } from '@/core/ai/score-client.factory';
import { ReviewCatalogProductQueryHandler } from '@/features/catalogo/queries/review-catalog-product.query';
import { JevProductReviewer } from '@/features/catalogo/infrastructure/jev-product.reviewer';
import type { ICatalogRepository } from '@/features/catalogo/abstracts/catalogo.repository.interface';
import { GetRecommendationsSchema, GetSearchRecommendationSchema } from '@/features/recomendaciones/models/recomendaciones.schema';
import { GetSearchRecommendationQueryHandler } from '@/features/recomendaciones/queries/get-search-recommendation.query';
import { RecordViewCommandHandler } from '@/features/recomendaciones/commands/record-view.command';
import { JevSearchProductSelector } from '@/features/recomendaciones/infrastructure/jev-search-product.selector';
import { RecommendationOwnerPolicy } from '@/features/recomendaciones/domain/recommendation-owner';
import { RecommendationPolicy } from '@/features/recomendaciones/domain/recommendation.policy';
import { DomainError } from '@/core/domain/domain.error';

function localCache(): ICache {
  const entries = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => (entries.get(key) as T | undefined) ?? null,
    set: async (key, data) => { entries.set(key, data); },
    clear: async () => { entries.clear(); },
  };
}

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
  const stats = { context: 0, search: 0, views: [] as Array<[string, number]> };
  const repo: IRecommendationsRepository = {
    getContext: async () => { stats.context++; return structuredClone(context); },
    findSearchCandidates: async () => { stats.search++; return structuredClone(context.candidates); },
    recordView: async (owner, idProducto) => { stats.views.push([owner.propietario, idProducto]); },
    purgeViews: async () => undefined,
  };
  return { context, cache, repo, stats };
}

const ask = (extra: Record<string, unknown> = {}) => ({ ...GetRecommendationsSchema.parse({ contexto: 'producto', ...extra }), idUsuario: 1, ...extra });

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
    assert.equal((await handler.handle(ask({ contexto: 'inicio' }))).items.length, 10);
    assert.ok(!(await handler.handle(ask({ contexto: 'favoritos' }))).items.some(p => p.IDProducto === 1));
    assert.deepEqual((await handler.handle(ask({ contexto: 'ofertas' }))).items.map(p => p.IDProducto), [3]);
    assert.deepEqual(placements, ['inicio', 'favoritos', 'ofertas']);
    context.signals = [];
    assert.equal((await handler.handle(ask({ contexto: 'favoritos', idCategoria: 1 }))).items.length, 0);
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
    const result = await handler.handle(ask());
    assert.equal(result.items.length, 10);
    assert.deepEqual(result.items.slice(0, 3).map(p => p.IDProducto), [15, 14, 13]);
    assert.equal(result.origen, 'jev');
    assert.deepEqual(await handler.handle(ask()), result);
    assert.equal(calls, 1);
  });

  it('consulta la cache antes de SQL: un acierto no llama al repositorio ni a la IA', async () => {
    const { repo, cache, stats } = fixture();
    let ranked = 0;
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => { ranked++; return null; } }, cache);
    const first = await handler.handle(ask());
    assert.equal(stats.context, 1);
    assert.deepEqual(await handler.handle(ask()), first);
    assert.deepEqual(await new GetRecommendationsQueryHandler(repo, { rank: async () => { ranked++; return null; } }, cache).handle(ask()), first);
    assert.equal(stats.context, 1);
    assert.equal(ranked, 1);
  });

  it('guarda 30 segundos el respaldo y 180 segundos el resultado de la IA', async () => {
    const { repo } = fixture();
    const ttls: number[] = [];
    const cache: ICache = { get: async () => null, set: async (_k, _v, ttl) => { ttls.push(ttl); }, clear: async () => undefined };
    await new GetRecommendationsQueryHandler(repo, { rank: async () => null }, cache).handle(ask());
    await new GetRecommendationsQueryHandler(repo, { rank: async () => [1] }, cache).handle(ask());
    assert.deepEqual(ttls, [30, 180]);
  });

  it('excluye el producto actual, carrito, agotados, inactivos y duplicados', async () => {
    const { context, repo, cache } = fixture();
    context.signals.push({ ...context.signals[0]!, IDProducto: 2, Tipo: 'CARRITO', Peso: 4 });
    context.candidates[2]!.StockTotalDisponible = 0;
    context.candidates[3]!.Activo = false;
    context.candidates.push(context.candidates[4]!);
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => null }, cache);
    const result = await handler.handle(ask({ idProducto: 1 }));
    const ids = result.items.map(p => p.IDProducto);
    assert.equal(result.origen, 'preferencias');
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, ids.length);
    for (const excluded of [1, 2, 3, 4]) assert.ok(!ids.includes(excluded));
  });

  it('separa la cache por propietario, contexto, producto y filtros', async () => {
    const { repo, cache } = fixture();
    let calls = 0;
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => { calls++; return null; } }, cache);
    await handler.handle(ask());
    await handler.handle(ask());
    await handler.handle(ask({ contexto: 'carrito' }));
    await handler.handle({ ...ask(), idUsuario: 2 });
    await handler.handle(ask({ idProducto: 5 }));
    await handler.handle(ask({ precioMax: 50 }));
    assert.equal(calls, 5);
  });

  it('comparte una llamada entre solicitudes simultaneas del mismo perfil', async () => {
    const { repo, cache, stats } = fixture();
    let calls = 0;
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return null;
    } }, cache);
    await Promise.all(Array.from({ length: 10 }, () => handler.handle(ask())));
    assert.equal(calls, 1);
    assert.equal(stats.context, 1);
  });

  it('exige propietario: sin usuario ni token de invitado valido responde 400', async () => {
    const { repo, cache } = fixture();
    const handler = new GetRecommendationsQueryHandler(repo, { rank: async () => null }, cache);
    const base = GetRecommendationsSchema.parse({});
    await assert.rejects(handler.handle(base), (err: unknown) => err instanceof DomainError && err.httpStatus === 400);
    assert.equal((await handler.handle({ ...base, tokenInvitado: 'g'.repeat(20) })).origen, 'preferencias');
  });

  it('ordena puntuaciones validas y envia solo datos de productos y preferencias', async () => {
    const { context } = fixture();
    const request: typeof fetch = async (url, init) => {
      assert.equal(String(url), 'https://jev.test/score');
      const body = JSON.parse(init!.body as string);
      assert.equal(typeof body.state, 'string');
      assert.ok(!body.state.includes('propietario'));
      assert.ok(!body.state.includes('correo'));
      assert.equal(Object.keys(body.questions).length, 15);
      assert.ok(init!.signal);
      return Response.json({ answers: Object.fromEntries(context.candidates.map(p => [`p${p.IDProducto}`, { score: p.IDProducto / 15 * 2 }])) });
    };
    const ranker = new JevRecommendationRanker(new JevScoreClient('test-key', 'test-model', 2000, 'https://jev.test/score', request, localCache()));
    const ids = await ranker.rank(context, 'carrito');
    assert.equal(ids?.[0], 15);
    assert.equal(ids?.[14], 1);
  });

  it('respalda errores, respuestas incompletas y puntuaciones invalidas sin reintentos continuos ni filtrar la clave', async () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
    try {
      for (const failure of ['network', 'timeout', 'http', 'missing', 'score']) {
        const { context } = fixture();
        let calls = 0;
        const request: typeof fetch = async () => {
          calls++;
          if (failure === 'network') throw new Error('offline test-key');
          if (failure === 'timeout') throw new DOMException('Timeout', 'TimeoutError');
          if (failure === 'http') return new Response('', { status: 429 });
          return Response.json({ answers: failure === 'missing' ? {} : { p1: { score: 3 } } });
        };
        const ranker = new JevRecommendationRanker(new JevScoreClient('test-key', 'test-model', 2000, 'https://jev.test/score', request, localCache()));
        assert.equal(await ranker.rank(context, 'producto'), null);
        assert.equal(await ranker.rank(context, 'producto'), null);
        assert.equal(calls, 1);
      }
    } finally {
      console.warn = original;
    }
    assert.equal(warnings.length, 5);
    assert.ok(warnings.some(w => w.includes('HTTP_429')));
    assert.ok(warnings.every(w => !w.includes('test-key')));
  });

  it('comparte el corte de 30 segundos entre clientes mediante la cache', async () => {
    const { context } = fixture();
    const shared = localCache();
    let calls = 0;
    const request: typeof fetch = async () => { calls++; return new Response('', { status: 500 }); };
    const silent = console.warn;
    console.warn = () => undefined;
    try {
      await new JevRecommendationRanker(new JevScoreClient('k', 'm', 2000, 'https://jev.test', request, shared)).rank(context, 'producto');
      await new JevRecommendationRanker(new JevScoreClient('k', 'm', 2000, 'https://jev.test', request, shared)).rank(context, 'producto');
    } finally {
      console.warn = silent;
    }
    assert.equal(calls, 1);
  });

  it('no consume la API sin clave o sin preferencias', async () => {
    const { context } = fixture();
    const request: typeof fetch = async () => { throw new Error('No debe llamarse'); };
    assert.equal(await new JevRecommendationRanker(new JevScoreClient('', 'test-model', 2000, 'https://jev.test', request, localCache())).rank(context, 'producto'), null);
    context.signals = [];
    assert.equal(await new JevRecommendationRanker(new JevScoreClient('test-key', 'test-model', 2000, 'https://jev.test', request, localCache())).rank(context, 'producto'), null);
  });
});

describe('Presupuesto global de la IA', () => {
  it('agotado el presupuesto no llama al proveedor y las recomendaciones usan el orden local', async () => {
    const { repo, cache } = fixture();
    let providerCalls = 0;
    const inner = { score: async (_s: unknown, q: Record<string, unknown>) => { providerCalls++; return Object.fromEntries(Object.keys(q).map(k => [k, 1])); } };
    const client = new BudgetedScoreClient(inner, new AiBudget(2, null), true);
    const handler = new GetRecommendationsQueryHandler(repo, new JevRecommendationRanker(client), cache);
    const origins: string[] = [];
    for (const idUsuario of [1, 2, 3, 4]) origins.push((await handler.handle({ ...ask(), idUsuario })).origen);
    assert.deepEqual(origins, ['jev', 'jev', 'preferencias', 'preferencias']);
    assert.equal(providerCalls, 2);
  });

  it('el presupuesto se reinicia cada minuto y se comparte mediante Redis', async () => {
    let now = 120_000;
    const memory = new AiBudget(2, null, () => now);
    assert.deepEqual([await memory.take(), await memory.take(), await memory.take()], [true, true, false]);
    now += 60_000;
    assert.equal(await memory.take(), true);

    const counters = new Map<string, number>();
    const expirations: Array<[string, number]> = [];
    const redis = {
      incr: async (key: string) => { counters.set(key, (counters.get(key) ?? 0) + 1); return counters.get(key)!; },
      expire: async (key: string, seconds: number) => { expirations.push([key, seconds]); },
    };
    const replicaA = new AiBudget(3, redis, () => now);
    const replicaB = new AiBudget(3, redis, () => now);
    const taken = [await replicaA.take(), await replicaB.take(), await replicaA.take(), await replicaB.take()];
    assert.deepEqual(taken, [true, true, true, false]);
    assert.equal(expirations.length, 1);
  });

  it('si Redis falla usa el contador local', async () => {
    const broken = { incr: async () => { throw new Error('redis'); }, expire: async () => undefined };
    const budget = new AiBudget(1, broken, () => 0);
    assert.deepEqual([await budget.take(), await budget.take()], [true, false]);
  });

  it('sin clave no gasta presupuesto ni llama al proveedor', async () => {
    let taken = 0;
    const client = new BudgetedScoreClient({ score: async () => { throw new Error('No debe llamarse'); } }, { take: async () => { taken++; return true; } } as AiBudget, false);
    assert.equal(await client.score({}, { p1: { type: 'score', instructions: 'x', criteria: ['a', 'b', 'c'] } }), null);
    assert.equal(taken, 0);
  });
});

describe('Propietario de recomendaciones', () => {
  it('usa el usuario autenticado sin leer el token de invitado', () => {
    assert.deepEqual(RecommendationOwnerPolicy.resolve({ idUsuario: 7, tokenInvitado: 'corto' }), { propietario: 'u:7', idUsuario: 7 });
  });

  it('resume el token de invitado con SHA-256 y lo conserva para el carrito', () => {
    const token = 'abcdefghijklmnop';
    const owner = RecommendationOwnerPolicy.resolve({ tokenInvitado: token });
    assert.match(owner.propietario, /^g:[0-9a-f]{64}$/);
    assert.equal(owner.tokenInvitado, token);
    assert.equal(RecommendationOwnerPolicy.resolve({ tokenInvitado: token }).propietario, owner.propietario);
    assert.notEqual(RecommendationOwnerPolicy.resolve({ tokenInvitado: token + 'x' }).propietario, owner.propietario);
  });

  it('rechaza tokens ausentes, cortos, largos o repetidos en cabecera', () => {
    for (const tokenInvitado of [undefined, '', 'x'.repeat(15), 'x'.repeat(101), ['x'.repeat(20)]]) {
      assert.throws(() => RecommendationOwnerPolicy.resolve({ tokenInvitado }), (err: unknown) =>
        err instanceof DomainError && err.code === 'MISSING_CART_OWNER' && err.httpStatus === 400);
    }
  });

  it('el comando de vistas registra con el propietario resuelto', async () => {
    const { repo, stats } = fixture();
    await new RecordViewCommandHandler(repo).handle({ idProducto: 4, idUsuario: 9 });
    assert.deepEqual(stats.views, [['u:9', 4]]);
    await assert.rejects(new RecordViewCommandHandler(repo).handle({ idProducto: 4 }), DomainError);
    assert.equal(stats.views.length, 1);
  });
});

describe('Revision del catalogo', () => {
  const context = {
    categories: [{ IDCategoria: 1, Nombre: 'Calzado' }, { IDCategoria: 2, Nombre: 'Camisas' }],
    products: [{ IDProducto: 10, Nombre: 'Camisa azul', Categoria: 'Camisas' }, { IDProducto: 11, Nombre: 'Camisa blanca', Categoria: 'Camisas' }],
  };
  const repo = { getReviewContext: async () => structuredClone(context) } as unknown as ICatalogRepository;
  const handlerWith = (score: (state: unknown, questions: Record<string, unknown>) => Promise<Record<string, number> | null>) =>
    new ReviewCatalogProductQueryHandler(repo, new JevProductReviewer({ score }));

  it('sugiere categorias existentes y duplicados fuertes sin mutar el catalogo', async () => {
    const handler = handlerWith(async () => ({ c1: 0.1, c2: 1.95, p10: 1.9, p11: 1.2 }));
    const result = await handler.handle({ nombre: 'Camisa azul' });
    assert.deepEqual(result.categoriaSugerida, { IDCategoria: 2, Nombre: 'Camisas' });
    assert.deepEqual(result.posiblesDuplicados.map(p => p.IDProducto), [10]);
    assert.equal(result.evaluacionDisponible, true);
    assert.equal(context.products.length, 2);
  });

  it('excluye el propio producto y descarta categorias ambiguas', async () => {
    const handler = handlerWith(async (_state, questions) => { assert.ok(!questions.p10); return { c1: 1, c2: 1.1, p11: 1 }; });
    const result = await handler.handle({ nombre: 'Camisa azul', idProducto: 10 });
    assert.equal(result.categoriaSugerida, null);
    assert.deepEqual(result.posiblesDuplicados, []);
  });

  it('ante una caida solo devuelve coincidencias exactas de nombre', async () => {
    const result = await handlerWith(async () => null).handle({ nombre: ' CÁMISA AZUL ' });
    assert.equal(result.evaluacionDisponible, false);
    assert.equal(result.categoriaSugerida, null);
    assert.deepEqual(result.posiblesDuplicados.map(p => p.IDProducto), [10]);
  });
});

describe('Producto recomendado en la busqueda', () => {
  const search = (extra: Record<string, unknown> = {}) => GetSearchRecommendationSchema.parse({ q: 'camisa azul', ...extra });

  it('envia como maximo veinte candidatos y devuelve un solo producto', async () => {
    const { context, cache } = fixture();
    const candidates = Array.from({ length: 40 }, (_, i) => ({ ...context.candidates[0]!, IDProducto: i + 1 }));
    let calls = 0;
    const handler = new GetSearchRecommendationQueryHandler({ findSearchCandidates: async () => candidates } as unknown as IRecommendationsRepository, {
      score: async (query, selected) => { calls++; assert.equal(query, 'camisa azul'); assert.equal(selected.length, 20); return new Map(selected.map(p => [p.IDProducto, p.IDProducto === 20 ? 1.9 : 0])); },
    }, cache);
    assert.equal((await handler.handle(search())).item?.IDProducto, 20);
    assert.equal((await handler.handle(search())).item?.IDProducto, 20);
    assert.equal(calls, 1);
  });

  it('consulta la cache antes de SQL con la consulta normalizada y los filtros', async () => {
    const { repo, cache, stats } = fixture();
    let calls = 0;
    const handler = new GetSearchRecommendationQueryHandler(repo, { score: async () => { calls++; return new Map([[1, 1.9]]); } }, cache);
    assert.equal((await handler.handle(search({ q: 'Camisa  Azul' }))).item?.IDProducto, 1);
    assert.equal((await handler.handle(search({ q: ' camisa azul ' }))).item?.IDProducto, 1);
    assert.equal(stats.search, 1);
    assert.equal(calls, 1);
    await handler.handle(search({ idCategoria: 3 }));
    assert.equal(stats.search, 2);
  });

  it('con menos de tres caracteres no consulta SQL ni llama a la IA', async () => {
    const { repo, cache, stats } = fixture();
    const handler = new GetSearchRecommendationQueryHandler(repo, { score: async () => { throw new Error('No debe llamarse'); } }, cache);
    assert.deepEqual(await handler.handle(search({ q: 'ab' })), { item: null });
    assert.deepEqual(await handler.handle(GetSearchRecommendationSchema.parse({ q: '  ab  ' })), { item: null });
    assert.equal(stats.search, 0);
    const scorerCalls: number[] = [];
    const real = new JevSearchProductSelector({ score: async () => { scorerCalls.push(1); return null; } });
    await new GetSearchRecommendationQueryHandler(repo, real, cache).handle(search({ q: 'ab' }));
    assert.equal(scorerCalls.length, 0);
  });

  it('no presenta recomendaciones con poca relevancia ni al fallar el proveedor', async () => {
    const { context } = fixture();
    const low = await new JevSearchProductSelector({ score: async () => Object.fromEntries(context.candidates.map(p => [`p${p.IDProducto}`, 1.6])) }).score('camisa azul', context.candidates);
    assert.equal(RecommendationPolicy.bestSearchMatch(context.candidates, low), null);
    const offline = await new JevSearchProductSelector({ score: async () => null }).score('camisa azul', context.candidates);
    assert.equal(offline, null);
    assert.equal(RecommendationPolicy.bestSearchMatch(context.candidates, offline), null);
    const good = await new JevSearchProductSelector({ score: async () => Object.fromEntries(context.candidates.map(p => [`p${p.IDProducto}`, p.IDProducto === 7 ? 1.95 : 0.2])) }).score('camisa azul', context.candidates);
    assert.equal(RecommendationPolicy.bestSearchMatch(context.candidates, good)?.IDProducto, 7);
  });

  it('no acepta productos ajenos a la lista filtrada por SQL', async () => {
    const { context, cache, repo } = fixture();
    const handler = new GetSearchRecommendationQueryHandler(repo, {
      score: async () => new Map([[9000, 2]]),
    }, cache);
    assert.equal(context.candidates.length, 15);
    assert.equal((await handler.handle(search({ q: 'camisa' }))).item, null);
  });
});
