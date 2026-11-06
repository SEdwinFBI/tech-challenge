import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getGuestToken } from '@/shared/lib/guestToken';
import { recommendationsApi } from '../api/recommendationsApi';
import type { RecommendationPlacement, RecommendationFilters } from '../models/recommendations';

export function useRecommendations(contexto: RecommendationPlacement, idProducto?: number, filters: RecommendationFilters = {}) {
  const user = useAuth(s => s.user);
  const identity = user ? `u:${user.idUsuario}` : `g:${getGuestToken()}`;
  const view = useQuery({
    queryKey: ['recommendation-view', identity, idProducto],
    queryFn: () => recommendationsApi.recordView(idProducto!),
    enabled: contexto === 'producto' && Boolean(idProducto),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return useQuery({
    queryKey: ['recommendations', identity, contexto, idProducto, filters, view.dataUpdatedAt],
    queryFn: () => recommendationsApi.list(contexto, idProducto, filters),
    enabled: contexto !== 'producto' || (Boolean(idProducto) && (view.isSuccess || view.isError)),
    staleTime: 30_000,
    retry: false,
  });
}
