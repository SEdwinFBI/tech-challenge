import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useSearchRecommendation } from '@/features/recommendations/hooks/useSearchRecommendation';
import { catalogApi } from '../api/catalogApi';

export function useSearchSuggestions(value: string, open: boolean) {
  const input = value.trim();
  const term = useDebounce(input, 350);
  const current = term === input;
  const enabled = open && current && term.length >= 2;
  const normal = useQuery({
    queryKey: ['search-suggestions', term],
    queryFn: ({ signal }) => catalogApi.getProducts({ q: term, tamanoPagina: 5 }, signal),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
  const ai = useSearchRecommendation({ q: term }, { enabled, debounceMs: 0 });
  const items = enabled ? normal.data?.items ?? [] : [];
  const recommendation = ai.product && !items.some(p => p.IDProducto === ai.product!.IDProducto) ? ai.product : null;
  return {
    term: input, items, recommendation,
    isLoading: open && input.length >= 2 && (!current || normal.isLoading),
    isError: enabled && normal.isError,
    recommendationLoading: ai.isFetching,
    recommendationError: ai.isError,
  };
}
