import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface RailProps {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

export const Rail: React.FC<RailProps> = ({ children, ariaLabel, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const arrow =
    'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-lift ring-1 ring-slate-200 transition hover:scale-105 md:flex';

  return (
    <div className={`relative ${className}`}>
      {canPrev && (
        <button type="button" onClick={() => scrollBy(-1)} aria-label="Anterior" className={`${arrow} -left-3`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div
        ref={ref}
        onScroll={update}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {React.Children.map(children, child => (
          <div className="snap-start shrink-0">{child}</div>
        ))}
      </div>
      {canNext && (
        <button type="button" onClick={() => scrollBy(1)} aria-label="Siguiente" className={`${arrow} -right-3`}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`mb-4 flex items-end justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
