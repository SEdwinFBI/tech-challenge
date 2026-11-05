import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded-md h-4'
      : 'rounded-xl';

  return (
    <div
      className={`animate-pulse bg-slate-200/80 ${variantClass} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col gap-3">
    <Skeleton className="w-full h-48 rounded-lg" />
    <Skeleton variant="text" className="w-1/3" />
    <Skeleton variant="text" className="w-4/5 h-5" />
    <div className="flex items-center justify-between pt-2">
      <Skeleton variant="text" className="w-1/4 h-6" />
      <Skeleton className="w-24 h-9 rounded-lg" />
    </div>
  </div>
);

export const TableRowsSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} className="border-b border-slate-100">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} className="px-4 py-4">
            <Skeleton variant="text" className="w-full max-w-[120px] h-4" />
          </td>
        ))}
      </tr>
    ))}
  </>
);
