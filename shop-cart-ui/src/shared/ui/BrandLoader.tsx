import React from 'react';

interface BrandLoaderProps {
  size?: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({ size = 160, label = 'Cargando…', showLabel = false, className = '' }) => (
  <div role="status" className={`flex flex-col items-center gap-2 ${className}`}>
    <img
      src="/shopCart-loading-2.svg"
      alt=""
      width={size}
      height={Math.round(size * 0.75)}
      decoding="async"
      draggable={false}
      style={{ width: size, height: 'auto' }}
    />
    <span className={showLabel ? 'text-sm font-bold text-slate-600' : 'sr-only'}>{label}</span>
  </div>
);
