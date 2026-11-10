import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/shared/lib/queryKeys';
import { ordersApi } from './api/ordersApi';

export const orderDetailQueryOptions = (orderId: number) =>
  queryOptions({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrderById(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });
