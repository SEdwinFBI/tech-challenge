import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { RECOMMENDATIONS_KEY } from '@/shared/lib/queryKeys';

export function useCart() {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const upsertMutation = useMutation({
    mutationFn: ({ idVariante, cantidad }: { idVariante: number; cantidad: number }) =>
      cartApi.upsertItem(idVariante, cantidad),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_KEY });
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'No se pudo actualizar la cantidad.');
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? 'Límite de existencia' : 'No se pudo actualizar el carrito', msg);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (idVariante: number) => cartApi.removeItem(idVariante),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.info('Producto quitado');
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_KEY });
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'No se pudo eliminar el producto.');
      toast.error(msg);
    },
  });

  const applyCouponMutation = useMutation({
    mutationFn: (codigo: string) => cartApi.applyCoupon(codigo),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.success('Cupón aplicado');
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'Cupón inválido o no aplica.');
      toast.error('Cupón no aplicable', msg);
    },
  });

  const removeCouponMutation = useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.info('Cupón quitado');
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'No se pudo quitar el cupón.');
      toast.error(msg);
    },
  });

  const totalItemsCount = (cartQuery.data?.items || []).reduce((acc, item) => acc + item.Cantidad, 0);

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    refetch: cartQuery.refetch,
    totalItemsCount,
    upsertItem: upsertMutation.mutate,
    isUpserting: upsertMutation.isPending,
    removeItem: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
    applyCoupon: applyCouponMutation.mutate,
    isApplyingCoupon: applyCouponMutation.isPending,
    removeCoupon: removeCouponMutation.mutate,
    isRemovingCoupon: removeCouponMutation.isPending,
  };
}
