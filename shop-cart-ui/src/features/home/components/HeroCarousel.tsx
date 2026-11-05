import React, { useCallback, useEffect, useState } from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  cta: { label: string; to: string };
  background: string;
  image?: string | null;
  imageAlt?: string;
}

export interface HeroCarouselProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides, intervalMs = 6500 }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setTimeout(() => go(index + 1), intervalMs);
    return () => clearTimeout(t);
  }, [index, paused, count, go, intervalMs]);

  if (count === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <article
            key={s.id}
            aria-hidden={i !== index}
            className={`relative grid min-h-[300px] w-full shrink-0 grid-cols-1 items-center gap-6 overflow-hidden p-6 text-white sm:min-h-[380px] sm:grid-cols-2 sm:p-12 ${s.background}`}
          >
            <span className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/5" aria-hidden="true" />

            <div className="relative z-10 max-w-md">
              <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
                {s.eyebrow}
              </p>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{s.title}</h2>
              {s.subtitle && <p className="mt-3 text-sm text-white/85 sm:text-base">{s.subtitle}</p>}
              <Link
                to={s.cta.to}
                tabIndex={i === index ? 0 : -1}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.98]"
              >
                {s.cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative z-10 hidden justify-center sm:flex">
              {s.image ? (
                <SafeImage
                  src={s.image}
                  alt={s.imageAlt ?? ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="h-64 w-64 rotate-3 rounded-3xl border-4 border-white/70 object-cover shadow-lift sm:h-72 sm:w-72"
                />
              ) : (
                <div className="h-56 w-56 rounded-full border-8 border-white/20" aria-hidden="true" />
              )}
            </div>
          </article>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Anterior"
            className="absolute bottom-4 right-16 hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:scale-105 sm:flex"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Siguiente"
            className="absolute bottom-4 right-4 hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:scale-105 sm:flex"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-6 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 backdrop-blur sm:left-12">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setPaused(p => !p)}
              aria-label={paused ? 'Reanudar' : 'Pausar'}
              className="ml-1 text-white/90 hover:text-white"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
