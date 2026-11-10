import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/shared/lib/queryKeys';
import { checkoutApi } from './api/checkoutApi';

export const addressesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.addresses.all,
    queryFn: checkoutApi.getAddresses,
    staleTime: 60_000,
  });
