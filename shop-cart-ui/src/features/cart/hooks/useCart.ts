import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { mutationKeys, queryKeys } from '@/shared/lib/queryKeys';
import type { Cart } from '@/shared/types/domain';

const pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();
const pendingTargets = new Map<number, number>();

export function flushCartUpdates() {
  for (const [idVariante, timer] of pendingTimers.entries()) {
    clearTimeout(timer);
    pendingTimers.delete(idVariante);
    const target = pendingTargets.get(idVariante);
    if (target !== undefined) {
      pendingTargets.delete(idVariante);
      if (target <= 0) {
        void cartApi.removeItem(idVariante);
      } else {
        void cartApi.upsertItem(idVariante, target);
      }
    }
  }
}

export function useCart() {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: async () => {
      const data = await cartApi.getCart();
      if (pendingTargets.size > 0 && data?.items) {
        return {
          ...data,
          items: data.items.map((item) => {
            const pending = pendingTargets.get(item.IDVariante);
            if (pending !== undefined) {
              return {
                ...item,
                Cantidad: pending,
                SubtotalLinea: Number((item.PrecioUnitario * pending).toFixed(2)),
              };
            }
            return item;
          }),
        };
      }
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const upsertMutation = useMutation({
    mutationKey: mutationKeys.cart.upsert,
    mutationFn: ({ idVariante, cantidad }: { idVariante: number; cantidad: number }) =>
      cartApi.upsertItem(idVariante, cantidad),
    onSuccess: (data, variables) => {
      const currentTarget = pendingTargets.get(variables.idVariante);
      if (currentTarget !== undefined && currentTarget !== variables.cantidad) {
        return;
      }
      pendingTargets.delete(variables.idVariante);
      queryClient.setQueryData(queryKeys.cart.all, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },
    onError: (err: unknown, variables) => {
      pendingTargets.delete(variables.idVariante);
      const msg = apiErrorMessage(err, 'No se pudo actualizar la cantidad.');
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? 'Límite de existencia' : 'No se pudo actualizar el carrito', msg);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },
  });

  const removeMutation = useMutation({
    mutationKey: mutationKeys.cart.remove,
    mutationFn: (idVariante: number) => cartApi.removeItem(idVariante),
    onSuccess: (data, idVariante) => {
      pendingTargets.delete(idVariante);
      queryClient.setQueryData(queryKeys.cart.all, data);
      toast.info('Producto quitado');
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },
    onError: (err: unknown, idVariante) => {
      pendingTargets.delete(idVariante);
      const msg = apiErrorMessage(err, 'No se pudo eliminar el producto.');
      toast.error(msg);
    },
  });

  const applyCouponMutation = useMutation({
    mutationKey: mutationKeys.cart.applyCoupon,
    mutationFn: (codigo: string) => cartApi.applyCoupon(codigo),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart.all, data);
      toast.success('Cupón aplicado');
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Cupón inválido o no aplica.');
      toast.error('Cupón no aplicable', msg);
    },
  });

  const removeCouponMutation = useMutation({
    mutationKey: mutationKeys.cart.removeCoupon,
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart.all, data);
      toast.info('Cupón quitado');
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'No se pudo quitar el cupón.');
      toast.error(msg);
    },
  });

  const optimisticApply = (idVariante: number, cantidad: number) => {
    const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart.all);
    if (!previousCart) return;

    const nextItems = previousCart.items.map((item) => {
      if (item.IDVariante === idVariante) {
        return {
          ...item,
          Cantidad: cantidad,
          SubtotalLinea: Number((item.PrecioUnitario * cantidad).toFixed(2)),
        };
      }
      return item;
    });

    const subtotal = Number(nextItems.reduce((acc, i) => acc + i.SubtotalLinea, 0).toFixed(2));
    const descuento = previousCart.descuento ?? 0;
    const total = Math.max(0, Number((subtotal - descuento).toFixed(2)));

    queryClient.setQueryData<Cart>(queryKeys.cart.all, {
      ...previousCart,
      items: nextItems,
      subtotal,
      total,
    });
  };

  const upsertItem = (
    args: { idVariante: number; cantidad: number },
    options?: Parameters<typeof upsertMutation.mutate>[1]
  ) => {
    const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart.all);
    const isExisting = previousCart?.items.some((i) => i.IDVariante === args.idVariante);

    if (isExisting && !options) {
      optimisticApply(args.idVariante, args.cantidad);
      pendingTargets.set(args.idVariante, args.cantidad);

      const existingTimer = pendingTimers.get(args.idVariante);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        pendingTimers.delete(args.idVariante);
        const target = pendingTargets.get(args.idVariante) ?? args.cantidad;
        if (target <= 0) {
          removeMutation.mutate(args.idVariante);
        } else {
          upsertMutation.mutate({ idVariante: args.idVariante, cantidad: target });
        }
      }, 350);

      pendingTimers.set(args.idVariante, timer);
    } else {
      upsertMutation.mutate(args, options);
    }
  };

  const removeItem = (idVariante: number) => {
    const existingTimer = pendingTimers.get(idVariante);
    if (existingTimer) {
      clearTimeout(existingTimer);
      pendingTimers.delete(idVariante);
    }
    pendingTargets.delete(idVariante);
    removeMutation.mutate(idVariante);
  };

  const totalItemsCount = (cartQuery.data?.items || []).reduce((acc, item) => acc + item.Cantidad, 0);

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    refetch: cartQuery.refetch,
    totalItemsCount,
    upsertItem,
    isUpserting: upsertMutation.isPending,
    removeItem,
    isRemoving: removeMutation.isPending,
    applyCoupon: applyCouponMutation.mutate,
    isApplyingCoupon: applyCouponMutation.isPending,
    removeCoupon: removeCouponMutation.mutate,
    isRemovingCoupon: removeCouponMutation.isPending,
    flushPendingUpdates: flushCartUpdates,
  };
}
