import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import type { RecommendationContext, RecommendationPlacement, SearchRecommendationResult } from '../models/recomendaciones.model';

export const RECOMMENDATION_LIMIT = 10;
export const SEARCH_CANDIDATE_LIMIT = 25;
export const SEARCH_MIN_LENGTH = 3;
export const SEARCH_SUGGESTION_MIN = 1.2;
export const SEARCH_HIGH_CONFIDENCE = 1.7;

const isAvailable = (p: ProductDTO) => p.Activo && (p.StockTotalDisponible ?? 0) > 0;
const isFirst = (p: ProductDTO, index: number, all: ProductDTO[]) => all.findIndex(other => other.IDProducto === p.IDProducto) === index;

export const RecommendationPolicy = {
  prepare(context: RecommendationContext, placement: RecommendationPlacement, idProducto?: number): RecommendationContext {
    const excluded = new Set(context.signals.filter(s => s.Tipo === 'CARRITO').map(s => s.IDProducto));
    if (placement === 'favoritos') context.signals.filter(s => s.Tipo === 'FAVORITO').forEach(s => excluded.add(s.IDProducto));
    const signals = placement === 'favoritos' ? context.signals.filter(s => s.Tipo === 'FAVORITO') : context.signals;
    const candidates = context.candidates.filter((p, index, all) => isAvailable(p) && isFirst(p, index, all)
      && p.IDProducto !== idProducto && !excluded.has(p.IDProducto)
      && (placement !== 'ofertas' || (p.PorcentajeDescuento ?? 0) >= 1));
    return { signals, candidates };
  },

  arrange(candidates: ProductDTO[], rankedIds: number[] | null): ProductDTO[] {
    const positions = new Map(rankedIds?.map((id, i) => [id, i]));
    return [...candidates].sort((a, b) => (positions.get(a.IDProducto) ?? 100) - (positions.get(b.IDProducto) ?? 100)).slice(0, RECOMMENDATION_LIMIT);
  },

  searchCandidates(candidates: ProductDTO[]): ProductDTO[] {
    return candidates.filter((p, index, all) => isAvailable(p) && isFirst(p, index, all)).slice(0, SEARCH_CANDIDATE_LIMIT);
  },

  canUseAi(query: string): boolean {
    return query.trim().length >= SEARCH_MIN_LENGTH;
  },

  bestSearchMatch(candidates: ProductDTO[], scores: Map<number, number> | null): SearchRecommendationResult {
    if (!scores) return { item: null };
    const best = [...candidates].sort((a, b) => (scores.get(b.IDProducto) ?? 0) - (scores.get(a.IDProducto) ?? 0))[0];
    const score = best ? scores.get(best.IDProducto) ?? 0 : 0;
    if (!best || !scores.has(best.IDProducto)) return { item: null };
    return { item: best, confianza: score >= SEARCH_HIGH_CONFIDENCE ? 'alta' : score >= SEARCH_SUGGESTION_MIN ? 'media' : 'baja' };
  },
};
