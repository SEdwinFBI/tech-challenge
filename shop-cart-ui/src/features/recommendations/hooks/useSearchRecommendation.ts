import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { recommendationsApi } from '../api/recommendationsApi';
import type { SearchRecommendationFilters } from '../models/recommendations';

export function useSearchRecommendation(filters: SearchRecommendationFilters, { enabled = true, debounceMs = 350 } = {}) {
  const debounced = useDebounce(JSON.stringify(filters), debounceMs);
  const current = debounced === JSON.stringify(filters);
  const query = useQuery({
    queryKey: ['search-recommendation', filters],
    queryFn: ({ signal }) => recommendationsApi.search(filters, signal),
    enabled: enabled && current && filters.q.trim().length >= 2,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { product: enabled && current ? query.data : null, isFetching: enabled && current && query.isFetching,
    isError: enabled && current && query.isError };
}
