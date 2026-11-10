import React from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { favoritesApi } from '../api/favoritesApi';
import { queryKeys } from '@/shared/lib/queryKeys';
import { ProductCard, ProductCardSkeletonV2 } from '@/shared/ui/ProductCard';
import { ErrorState, Illustration } from '@/shared/ui';
import { RecommendationRail } from '@/features/recommendations/components/RecommendationRail';

export const FavoritesPage: React.FC = () => {
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.favorites.list(), queryFn: favoritesApi.list });

  return (
    <div className="animate-fade-up">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Favoritos</h1>
        <p className="text-sm text-slate-500">{data.length > 0 ? `${data.length} ${data.length === 1 ? 'producto guardado' : 'productos guardados'}` : 'Guarda lo que te gusta para encontrarlo después.'}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeletonV2 key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState title="No pudimos cargar tus favoritos" onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-canvas px-6 py-14 text-center">
          <Illustration name="heart" />
          <h2 className="mt-4 text-lg font-extrabold text-slate-900">Aún no tienes favoritos</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Toca el corazón de cualquier producto para guardarlo aquí.</p>
          <Link to="/catalogo" className="mt-5 inline-flex h-11 items-center rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          {data.map(p => <ProductCard key={p.IDProducto} product={p} />)}
        </div>
      )}
      {!isLoading && !isError && data.length > 0 && (
        <div className="mt-12"><RecommendationRail placement="favoritos" title="Parecidos a tus favoritos" subtitle="Alternativas y complementos de tus productos guardados." /></div>
      )}
    </div>
  );
};
