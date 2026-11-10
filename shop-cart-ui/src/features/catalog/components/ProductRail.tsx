import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { ProductListItem } from '@/shared/types/domain';
import { Rail, SectionHeader } from '@/shared/ui/Rail';
import { ConnectedProductCard } from './ConnectedProductCard';

export interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: ProductListItem[];
  to?: string;
  loading?: boolean;
}

export const ProductRail: React.FC<ProductRailProps> = ({ title, subtitle, products, to, loading = false }) => {
  if (!loading && products.length === 0) return null;

  return (
    <section aria-label={title} className="animate-fade-up">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          to ? (
            <Link
              to={to}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              Ver todo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : undefined
        }
      />
      <Rail ariaLabel={title}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-44 animate-pulse sm:w-52" aria-hidden="true">
                <div className="aspect-square rounded-card bg-slate-200/70" />
                <div className="mt-3 h-4 w-4/5 rounded bg-slate-200/70" />
                <div className="mt-2 h-5 w-1/2 rounded bg-slate-200/70" />
              </div>
            ))
          : products.map(p => <ConnectedProductCard key={p.IDProducto} product={p} variant="compact" />)}
      </Rail>
    </section>
  );
};
