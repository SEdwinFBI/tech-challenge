import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from '@/shared/ui/toastStore';
import { favoritesApi } from '../api/favoritesApi';
import { apiErrorMessage } from '@/shared/lib/apiErrors';

const IDS_KEY = ['favorites', 'ids'] as const;

/** Favoritos del cliente. Otros roles reciben aviso en el botón. */
export function useFavorites() {
  const user = useAuth(s => s.user);
  const queryClient = useQueryClient();
  const enabled = user?.rol === 'CLIENTE';

  const idsQuery = useQuery({
    queryKey: IDS_KEY,
    queryFn: favoritesApi.ids,
    enabled,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ idProducto, add }: { idProducto: number; add: boolean }) =>
      add ? favoritesApi.add(idProducto) : favoritesApi.remove(idProducto),
    onMutate: async ({ idProducto, add }) => {
      await queryClient.cancelQueries({ queryKey: IDS_KEY });
      const previous = queryClient.getQueryData<number[]>(IDS_KEY) ?? [];
      queryClient.setQueryData<number[]>(
        IDS_KEY,
        add ? [idProducto, ...previous.filter(id => id !== idProducto)] : previous.filter(id => id !== idProducto),
      );
      return { previous };
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(IDS_KEY, ctx.previous);
      const msg = apiErrorMessage(err, '');
      toast.error('No se pudo actualizar tus favoritos', msg);
    },
    onSuccess: (_d, { add }) => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success(add ? 'Guardado en favoritos' : 'Quitado de favoritos');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
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
