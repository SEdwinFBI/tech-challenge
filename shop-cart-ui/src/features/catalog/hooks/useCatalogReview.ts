import { useMutation } from '@tanstack/react-query';
import { mutationKeys } from '@/shared/lib/queryKeys';
import { catalogApi, type ReviewInput } from '../api/catalogApi';

export function useCatalogReview() {
  const mutation = useMutation({ mutationKey: mutationKeys.catalog.review, mutationFn: (input: ReviewInput) => catalogApi.review(input) });
  return {
    analyze: mutation.mutate,
    reset: mutation.reset,
    isPending: mutation.isPending,
    isError: mutation.isError,
    result: mutation.data,
  };
}
