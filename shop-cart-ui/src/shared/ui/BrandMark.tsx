import React from 'react';

interface BrandMarkProps {
  className?: string;
  light?: boolean;
  priority?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', light = true, priority = true }) => (
  <span className={`flex items-center gap-2.5 ${className}`}>
    <picture className="block h-10 w-10 shrink-0">
      <source srcSet="/brand/shopcart-icon-96.webp" type="image/webp" />
      <img
        src="/brand/shopcart-icon-96.png"
        alt="ShopCart"
        width={40}
        height={40}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-10 w-10 rounded-xl shadow-sm"
      />
    </picture>
    <span className="leading-none">
      <span className={`block text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>ShopCart</span>
      <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${light ? 'text-white/70' : 'text-brand'}`}>Don Arturo</span>
    </span>
  </span>
);

interface BrandLogoProps {
  className?: string;
  width?: number;
  variant?: 'full' | 'mascot';
}

const LOGO_SOURCES = {
  full: { path: '/brand/logo-full', ratio: 498 / 512 },
  mascot: { path: '/brand/logo-mascot', ratio: 256 / 262 },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', width = 160, variant = 'full' }) => {
  const { path, ratio } = LOGO_SOURCES[variant];
  return (
    <picture>
      <source srcSet={`${path}.webp`} type="image/webp" />
      <img
        src={`${path}.png`}
        alt="ShopCart"
        width={width}
        height={Math.round(width * ratio)}
        decoding="async"
        className={className}
      />
    </picture>
  );
};
