import { useQuery } from '@tanstack/react-query';
import { categoriesQueryOptions } from '../queries';

export function useCategories() {
  return useQuery(categoriesQueryOptions());
}
