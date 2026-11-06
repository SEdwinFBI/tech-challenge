import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { useCatalogReview } from '../hooks/useCatalogReview';
import type { ReviewInput } from '../models/catalogReview';

interface Props extends ReviewInput { onCategory: (id: number) => void }

export function CatalogReviewPanel({ nombre, descripcion, idProducto, onCategory }: Props) {
  const online = useOnlineStatus();
  const input = { nombre: nombre.trim(), descripcion: descripcion?.trim() || undefined, idProducto };
  const { analyze, isPending, isError, result } = useCatalogReview(input);
  return (
    <section aria-label="Revisión del catálogo" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-900">Revisión del catálogo</p>
      <p className="text-xs text-slate-600">Obtén una categoría sugerida y revisa posibles publicaciones duplicadas antes de guardar.</p>
      <button type="button" disabled={!online || input.nombre.length < 3 || isPending}
        onClick={analyze} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">
        {isPending ? 'Revisando…' : 'Analizar producto'}
      </button>
      {isError && <p role="alert" className="text-sm text-rose-700">No pudimos revisar el producto. Puedes intentarlo de nuevo.</p>}
      {result && <div className="space-y-3 text-sm" aria-live="polite">
        {!result.evaluacionDisponible && <p>La evaluación automática no está disponible. Solo se muestran coincidencias exactas del nombre.</p>}
        {result.categoriaSugerida ? <div className="flex flex-wrap items-center gap-3">
          <span>Categoría sugerida: <strong>{result.categoriaSugerida.Nombre}</strong></span>
          <button type="button" onClick={() => onCategory(result.categoriaSugerida!.IDCategoria)} className="font-bold text-brand underline">Usar categoría</button>
        </div> : result.evaluacionDisponible && <p>No hay una categoría sugerida con suficiente certeza.</p>}
        {result.posiblesDuplicados.length > 0 ? <div>
          <p className="font-bold">Posibles duplicados para revisar</p>
          <ul className="mt-1 list-inside list-disc">{result.posiblesDuplicados.map(p => <li key={p.IDProducto}>#{p.IDProducto} · {p.Nombre} · {p.Categoria}</li>)}</ul>
        </div> : <p>No se encontraron posibles duplicados entre los productos comparados.</p>}
        <p className="text-xs text-slate-500">Revisa la sugerencia y guarda el formulario para aplicar los cambios.</p>
      </div>}
    </section>
  );
}
