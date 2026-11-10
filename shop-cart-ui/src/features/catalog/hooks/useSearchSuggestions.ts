import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { catalogApi } from '../api/catalogApi';
import { queryKeys } from '@/shared/lib/queryKeys';
import { useCategories } from './useCatalog';

export const SUGGESTION_DEBOUNCE_MS = 250;
export const MIN_QUERY = 2;

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function useSearchSuggestions(value: string, open: boolean) {
  const input = value.trim();
  const term = useDebounce(input, SUGGESTION_DEBOUNCE_MS);
  const settled = term === input;
  const enabled = open && settled && term.length >= MIN_QUERY;

  const products = useQuery({
    queryKey: queryKeys.search.suggestions(term),
    queryFn: ({ signal }) => catalogApi.getProducts({ q: term, tamanoPagina: 5 }, signal),
    enabled,
    staleTime: 30_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const { data: allCategories } = useCategories();

  const categories = useMemo(() => {
    if (input.length < MIN_QUERY) return [];
    const tokens = fold(input).split(/\s+/).filter(Boolean);
    return (allCategories ?? [])
      .filter(c => c.Activo !== false && tokens.every(t => fold(c.Nombre).includes(t)))
      .slice(0, 3);
  }, [allCategories, input]);

  const active = input.length >= MIN_QUERY;
  const items = active ? products.data?.items ?? [] : [];

  return {
    input,
    term,
    enabled,
    settled,
    active,
    items,
    categories,
    loading: active && (!settled || (products.isFetching && items.length === 0)),
    stale: active && (!settled || products.isPlaceholderData),
    failed: enabled && products.isError,
  };
}

export const optionDomId = (listId: string, key: string) => `${listId}-${key}`;
