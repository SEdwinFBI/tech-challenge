import React, { useMemo } from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { catalogApi, type GetProductsParams } from '@/features/catalog/api/catalogApi';
import { useCategories } from '@/features/catalog/hooks/useCatalog';
import { ProductRail } from '@/features/catalog/components/ProductRail';
import { useRecentlyViewed } from '@/shared/lib/recentlyViewed';
import { SectionHeader, Rail } from '@/shared/ui/Rail';
import { ErrorState } from '@/shared/ui';
import { CategoryRail } from '../components/CategoryRail';
import { HeroCarousel, type HeroSlide } from '../components/HeroCarousel';
import { RecommendationRail } from '@/features/recommendations/components/RecommendationRail';

const SECTION_SIZE = 10;

function useSection(key: string, params: GetProductsParams) {
  return useQuery({
    queryKey: ['home', key, params],
    queryFn: () => catalogApi.getProducts({ ...params, pagina: 1, tamanoPagina: SECTION_SIZE }),
    staleTime: 60_000,
  });
}

export const HomePage: React.FC = () => {
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const destacados = useSection('destacados', { orden: 'DESTACADOS', soloDestacados: 'true' });
  const ofertas = useSection('ofertas', { orden: 'DESTACADOS', soloOfertas: 'true' });
  const nuevos = useSection('nuevos', { orden: 'RECIENTES', soloNuevos: 'true' });
  const vendidos = useSection('vendidos', { orden: 'MAS_VENDIDOS' });
  const recientes = useRecentlyViewed();

  const anyError = [destacados, ofertas, nuevos, vendidos].some(q => q.isError);
  const ofertasItems = ofertas.data?.items ?? [];
  const nuevosItems = nuevos.data?.items ?? [];
  const destacadosItems = destacados.data?.items ?? [];
  const vendidosItems = vendidos.data?.items ?? [];

  const maxDiscount = useMemo(
    () => ofertasItems.reduce((m, p) => Math.max(m, p.PorcentajeDescuento ?? 0), 0),
    [ofertasItems],
  );

  const slides = useMemo<HeroSlide[]>(() => {
    const list: HeroSlide[] = [];
    if (ofertasItems.length > 0) {
      list.push({
        id: 'ofertas',
        eyebrow: 'Ofertas',
        title: maxDiscount > 0 ? `Hasta ${maxDiscount}% de descuento` : 'Ofertas',
        cta: { label: 'Ver ofertas', to: '/ofertas' },
        background: 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900',
        image: ofertasItems[0].ImagenUrl,
        imageAlt: ofertasItems[0].Nombre,
      });
    }
    if (nuevosItems.length > 0 || destacadosItems.length > 0) {
      const p = nuevosItems[0] ?? destacadosItems[0];
      list.push({
        id: 'nuevo',
        eyebrow: nuevosItems.length > 0 ? 'Nuevo' : 'Destacado',
        title: nuevosItems.length > 0 ? 'Lo nuevo' : 'Destacados',
        cta: { label: 'Ver todo', to: nuevosItems.length > 0 ? '/novedades' : '/catalogo?orden=DESTACADOS' },
        background: 'bg-gradient-to-br from-brand via-brand-hover to-brand-deep',
        image: p?.ImagenUrl,
        imageAlt: p?.Nombre,
      });
    }
    list.push({
      id: 'envios',
      eyebrow: 'Envíos',
      title: 'A todo el país',
      cta: { label: 'Ver catálogo', to: '/catalogo' },
      background: 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950',
      image: vendidosItems[0]?.ImagenUrl,
      imageAlt: vendidosItems[0]?.Nombre,
    });
    return list;
  }, [ofertasItems, nuevosItems, destacadosItems, vendidosItems, maxDiscount]);

  const bentoA = vendidosItems[0];
  const bentoB = destacadosItems[0] ?? vendidosItems[1];

  return (
    <div className="space-y-12">
      <RecommendationRail placement="inicio" title="Elegidos para ti" subtitle="Descubre productos según lo que te gusta." />
      {anyError && (
        <ErrorState
          title="Algunas secciones no cargaron"
          onRetry={() => [destacados, ofertas, nuevos, vendidos].forEach(q => q.isError && q.refetch())}
        />
      )}

      <section aria-label="Promociones" className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        {destacados.isLoading && ofertas.isLoading && nuevos.isLoading ? (
          <div className="min-h-[300px] animate-pulse rounded-3xl bg-slate-200/70 sm:min-h-[380px]" aria-hidden="true" />
        ) : (
          <HeroCarousel slides={slides} />
        )}
        <div className="hidden gap-4 lg:grid lg:grid-rows-2">
          {[
            { p: bentoA, to: '/catalogo?orden=MAS_VENDIDOS', label: 'Lo más vendido', tone: 'from-amber-400 to-orange-500' },
            { p: bentoB, to: '/catalogo?orden=DESTACADOS', label: 'Destacados', tone: 'from-teal-500 to-emerald-700' },
          ].map(t => (
            <Link
              key={t.label}
              to={t.to}
              className={`group relative flex items-end overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-card ${t.tone}`}
            >
              {t.p?.ImagenUrl && (
                <SafeImage
                  src={t.p.ImagenUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-105"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
              <span className="relative">
                <span className="block text-lg font-extrabold leading-tight">{t.label}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-white/90">
                  Ver ahora <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Categorías">
        <SectionHeader title="Categorías" />
        {loadingCategories ? (
          <div className="flex gap-4 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-24 shrink-0 animate-pulse text-center sm:w-28">
                <div className="mx-auto h-20 w-20 rounded-full bg-slate-200/70 sm:h-24 sm:w-24" />
                <div className="mx-auto mt-2 h-3 w-16 rounded bg-slate-200/70" />
              </div>
            ))}
          </div>
        ) : (
          <CategoryRail categories={categories} />
        )}
      </section>

      <ProductRail
        title="Ofertas de la semana"
        products={ofertasItems}
        to="/ofertas"
        loading={ofertas.isLoading}
      />
      <ProductRail
        title="Los más vendidos"
        products={vendidosItems}
        to="/catalogo?orden=MAS_VENDIDOS"
        loading={vendidos.isLoading}
      />
      <ProductRail title="Lo nuevo" products={nuevosItems} to="/novedades" loading={nuevos.isLoading} />
      <ProductRail
        title="Recomendados"
        products={destacadosItems}
        to="/catalogo?orden=DESTACADOS"
        loading={destacados.isLoading}
      />

      {recientes.length > 0 && (
        <section aria-label="Vistos recientemente">
          <SectionHeader title="Vistos recientemente" />
          <Rail ariaLabel="Vistos recientemente">
            {recientes.map(p => (
              <Link key={p.id} to={`/producto/${p.id}`} className="group block w-36 sm:w-40">
                <span className="block aspect-square overflow-hidden rounded-card bg-canvas">
                  {p.imagen && <SafeImage src={p.imagen} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                </span>
                <span className="mt-2 line-clamp-2 block text-xs font-semibold text-slate-700 group-hover:text-brand">{p.nombre}</span>
              </Link>
            ))}
          </Rail>
        </section>
      )}

    </div>
  );
};
