import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';

export interface ISearchProductSelector {
  select(query: string, candidates: ProductDTO[]): Promise<ProductDTO | null>;
}
