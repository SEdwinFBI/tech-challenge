import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'sale';
  size?: 'sm' | 'md';
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  sale: 'bg-sale text-white border-sale',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export function getOrderStatusBadge(status: string): React.ReactNode {
  switch (status) {
    case 'PAGADO':
      return <Badge variant="info">Pagado</Badge>;
    case 'EN_PREPARACION':
      return <Badge variant="purple">En preparación</Badge>;
    case 'DESPACHADO':
      return <Badge variant="warning">Despachado</Badge>;
    case 'ENTREGADO':
      return <Badge variant="success">Entregado</Badge>;
    case 'CANCELADO':
      return <Badge variant="error">Cancelado</Badge>;
    case 'DEVUELTO_PARCIAL':
      return <Badge variant="warning">Devolución parcial</Badge>;
    case 'DEVUELTO_TOTAL':
      return <Badge variant="error">Devuelto</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
