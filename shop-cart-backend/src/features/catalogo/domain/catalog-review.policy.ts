import type { CatalogReviewContext, CatalogReviewResult, CatalogReviewScores } from '../models/catalogo.model';

export const CATEGORY_SCORE_THRESHOLD = 1.5;
export const DUPLICATE_SCORE_THRESHOLD = 1.7;
export const MAX_DUPLICATES = 5;

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const CatalogReviewPolicy = {
  normalize,

  comparable(context: CatalogReviewContext, idProducto?: number): CatalogReviewContext {
    return { categories: context.categories, products: context.products.filter(p => p.IDProducto !== idProducto) };
  },

  evaluate(nombre: string, context: CatalogReviewContext, scores: CatalogReviewScores | null): CatalogReviewResult {
    const productScore = (id: number) => scores?.products.get(id) ?? 0;
    const category = scores ? [...context.categories].sort((a, b) => (scores.categories.get(b.IDCategoria) ?? 0) - (scores.categories.get(a.IDCategoria) ?? 0))[0] : undefined;
    const duplicates = context.products
      .filter(p => scores ? productScore(p.IDProducto) >= DUPLICATE_SCORE_THRESHOLD : normalize(p.Nombre) === normalize(nombre))
      .sort((a, b) => productScore(b.IDProducto) - productScore(a.IDProducto))
      .slice(0, MAX_DUPLICATES);
    return {
      categoriaSugerida: category && (scores?.categories.get(category.IDCategoria) ?? 0) >= CATEGORY_SCORE_THRESHOLD
        ? { IDCategoria: category.IDCategoria, Nombre: category.Nombre } : null,
      posiblesDuplicados: duplicates.map(p => ({ IDProducto: p.IDProducto, Nombre: p.Nombre, Categoria: p.Categoria })),
      evaluacionDisponible: scores !== null,
    };
  },
};
