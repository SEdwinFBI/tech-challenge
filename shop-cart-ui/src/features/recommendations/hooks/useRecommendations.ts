import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { getGuestToken } from '@/shared/lib/guestToken';
import { mutationKeys, queryKeys } from '@/shared/lib/queryKeys';
import {
  recommendationsApi,
  type RecommendationFilters,
  type RecommendationPlacement,
  type SearchRecommendationFilters,
} from '../api/recommendationsApi';

const viewedInSession = new Set<string>();

function useIdentity() {
  const user = useAuth(s => s.user);
  return user ? `u:${user.idUsuario}` : `g:${getGuestToken()}`;
}

export function useRecommendations(contexto: RecommendationPlacement, idProducto?: number, filters: RecommendationFilters = {}) {
  const identity = useIdentity();
  return useQuery({
    queryKey: queryKeys.recommendations.list(identity, contexto, idProducto, filters),
    queryFn: () => recommendationsApi.list(contexto, idProducto, filters),
    enabled: contexto !== 'producto' || Boolean(idProducto),
    staleTime: 30_000,
    retry: false,
  });
}

export function useRecordProductView(idProducto?: number) {
  const identity = useIdentity();
  const { mutate } = useMutation({ mutationKey: mutationKeys.recommendations.recordView, mutationFn: recommendationsApi.recordView });

  useEffect(() => {
    if (!idProducto) return;
    const key = `${identity}:${idProducto}`;
    if (viewedInSession.has(key)) return;
    viewedInSession.add(key);
    mutate(idProducto);
  }, [identity, idProducto, mutate]);
}

export function useSearchRecommendation(filters: SearchRecommendationFilters, { enabled = true, debounceMs = 350 } = {}) {
  const serialized = JSON.stringify(filters);
  const settled = useDebounce(serialized, debounceMs) === serialized;
  const active = enabled && settled;
  const query = useQuery({
    queryKey: queryKeys.search.recommendation(filters),
    queryFn: ({ signal }) => recommendationsApi.search(filters, signal),
    enabled: active && filters.q.trim().length >= 2,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return {
    product: active ? query.data?.product ?? null : null,
    confianza: active ? query.data?.confianza ?? null : null,
    isFetching: active && query.isFetching,
    isError: active && query.isError,
  };
}
