import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/shared/lib/queryKeys';
import { catalogApi } from './api/catalogApi';

export const productQueryOptions = (productId: number, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.product.detail(productId),
    queryFn: () => catalogApi.getProductById(productId),
    enabled,
  });

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories.all,
    queryFn: () => catalogApi.getCategories(),
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
  });
