import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { SearchSuggestionItem } from './SearchSuggestionItem';

interface Props { value: string; onSelect: (id: number) => void }

export function SearchSuggestionsPanel({ value, onSelect }: Props) {
  const { term, items, recommendation, isLoading, isError, recommendationLoading, recommendationError } = useSearchSuggestions(value, true);
  return <>
    {isLoading && items.length === 0 ? <p role="status" className="px-4 py-3 text-sm text-slate-500">Buscando…</p>
      : isError ? <p role="status" className="px-4 py-3 text-sm text-slate-500">No pudimos cargar los resultados.</p>
      : items.length === 0 ? <p className="px-4 py-3 text-sm text-slate-500">Sin coincidencias exactas para “{term}”.</p>
      : <ul aria-label="Resultados de búsqueda">{items.map(p => <li key={p.IDProducto}><SearchSuggestionItem product={p} onSelect={onSelect} /></li>)}</ul>}
    {(recommendation || recommendationLoading || recommendationError) && <section aria-label="Recomendado por la IA" className="border-t border-slate-200 py-2">
      <h2 className="px-4 pb-1 text-xs font-bold uppercase tracking-wide text-brand">Recomendado por la IA</h2>
      {recommendation ? <SearchSuggestionItem product={recommendation} onSelect={onSelect} recommended />
        : recommendationLoading ? <p role="status" className="px-4 py-2 text-sm text-slate-500">Buscando una recomendación…</p>
        : <p role="status" className="px-4 py-2 text-sm text-slate-500">No pudimos cargar la recomendación.</p>}
    </section>}
  </>;
}
