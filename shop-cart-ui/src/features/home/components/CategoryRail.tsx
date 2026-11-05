import React from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { Link } from 'react-router';
import type { Category } from '@/shared/types/domain';
import { Rail } from '@/shared/ui/Rail';

const GRADIENTS = [
  'from-emerald-200 to-teal-300',
  'from-amber-200 to-orange-300',
  'from-sky-200 to-indigo-300',
  'from-rose-200 to-pink-300',
  'from-lime-200 to-green-300',
  'from-violet-200 to-fuchsia-300',
];

export const CategoryBubble: React.FC<{ category: Category; index: number }> = ({ category, index }) => (
  <Link
    to={`/categoria/${category.IDCategoria}`}
    className="group flex w-24 flex-col items-center gap-2 text-center sm:w-28"
  >
    <span
      className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ring-4 ring-white shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift sm:h-24 sm:w-24 ${GRADIENTS[index % GRADIENTS.length]}`}
    >
      {category.ImagenUrl ? (
        <SafeImage src={category.ImagenUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
      ) : (
        <span className="text-2xl font-extrabold text-white/90" aria-hidden="true">
          {category.Nombre.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
    <span className="line-clamp-2 text-xs font-semibold leading-4 text-slate-700 group-hover:text-brand sm:text-[13px]">
      {category.Nombre}
    </span>
  </Link>
);

export const CategoryRail: React.FC<{ categories: Category[] }> = ({ categories }) => {
  const active = categories.filter(c => c.Activo !== false);
  if (active.length === 0) return null;
  return (
    <Rail ariaLabel="Categorías">
      {active.map((c, i) => (
        <CategoryBubble key={c.IDCategoria} category={c} index={i} />
      ))}
    </Rail>
  );
};
