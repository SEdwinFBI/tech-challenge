import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/ui/toastStore';
import { favoritesApi } from '../api/favoritesApi';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { mutationKeys, queryKeys } from '@/shared/lib/queryKeys';

/** Favoritos del cliente. Otros roles reciben aviso en el botón. */
export function useFavorites() {
  const user = useAuth(s => s.user);
  const queryClient = useQueryClient();
  const enabled = user?.rol === 'CLIENTE';

  const idsQuery = useQuery({
    queryKey: queryKeys.favorites.ids(),
    queryFn: favoritesApi.ids,
    enabled,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationKey: mutationKeys.favorites.toggle,
    mutationFn: ({ idProducto, add }: { idProducto: number; add: boolean }) =>
      add ? favoritesApi.add(idProducto) : favoritesApi.remove(idProducto),
    onMutate: async ({ idProducto, add }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.ids() });
      const previous = queryClient.getQueryData<number[]>(queryKeys.favorites.ids()) ?? [];
      queryClient.setQueryData<number[]>(
        queryKeys.favorites.ids(),
        add ? [idProducto, ...previous.filter(id => id !== idProducto)] : previous.filter(id => id !== idProducto),
      );
      return { previous };
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(queryKeys.favorites.ids(), ctx.previous);
      const msg = apiErrorMessage(err, '');
      toast.error('No se pudo actualizar tus favoritos', msg);
    },
    onSuccess: (_d, { add }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
      toast.success(add ? 'Guardado en favoritos' : 'Quitado de favoritos');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
    },
  });

  const ids = idsQuery.data ?? [];

  return {
    canUse: enabled,
    ids,
    isFavorite: (idProducto: number) => ids.includes(idProducto),
    toggle: (idProducto: number) => {
      if (!user) {
        toast.info('Inicia sesión para guardar favoritos', 'Así los verás en todos tus dispositivos.');
        return;
      }
      if (!enabled) {
        toast.info('Los favoritos son exclusivos de las cuentas de cliente.');
        return;
      }
      mutation.mutate({ idProducto, add: !ids.includes(idProducto) });
    },
  };
}
