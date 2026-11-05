import React, { useEffect, useState } from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

export interface ProductGalleryProps {
  images: string[];
  alt: string;
  badges?: React.ReactNode;
  overlay?: React.ReactNode;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, alt, badges, overlay }) => {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const count = images.length;

  useEffect(() => setIndex(0), [images.join('|')]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-canvas text-slate-300">
        <ImageOff className="h-16 w-16" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div
        className="relative aspect-square flex-1 overflow-hidden rounded-3xl bg-canvas"
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') go(index - 1);
          if (e.key === 'ArrowRight') go(index + 1);
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="galería"
        aria-label={`Imágenes de ${alt}`}
      >
        <SafeImage
          src={images[index]}
          alt={`${alt}, imagen ${index + 1} de ${count}`}
          className="h-full w-full object-cover transition-transform duration-200 ease-out"
          style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          draggable={false}
        />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">{badges}</div>
        {overlay}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-105"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto lg:max-h-[34rem] lg:flex-col lg:overflow-y-auto" role="tablist" aria-label="Miniaturas">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ver imagen ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-canvas ring-2 transition ${
                i === index ? 'ring-brand' : 'ring-transparent hover:ring-slate-300'
              }`}
            >
              <SafeImage src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
