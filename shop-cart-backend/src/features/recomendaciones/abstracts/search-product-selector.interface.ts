import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';

export interface ISearchProductSelector {
  score(query: string, candidates: ProductDTO[]): Promise<Map<number, number> | null>;
}
