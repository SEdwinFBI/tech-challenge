import { useMutation } from '@tanstack/react-query';
import { catalogReviewApi } from '../api/catalogReviewApi';
import type { ReviewInput } from '../models/catalogReview';

export function useCatalogReview(input: ReviewInput) {
  const mutation = useMutation({ mutationFn: catalogReviewApi.review });
  const current = JSON.stringify(mutation.variables) === JSON.stringify(input);
  return { analyze: () => mutation.mutate(input), isPending: mutation.isPending,
    isError: current && mutation.isError, result: current ? mutation.data : undefined };
}
