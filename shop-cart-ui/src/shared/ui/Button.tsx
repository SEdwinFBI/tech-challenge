import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'cta' | 'brand' | 'outline-pill';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  pill?: boolean;
  block?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:bg-indigo-300',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400',
  destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:bg-rose-300',
  outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 disabled:opacity-50',
  cta: 'bg-cta hover:bg-cta-hover text-cta-fg font-bold shadow-sm shadow-amber-200/60 disabled:opacity-60',
  brand: 'bg-brand hover:bg-brand-hover text-white shadow-sm disabled:opacity-60',
  'outline-pill': 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs disabled:opacity-50',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-2.5 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base font-semibold rounded-lg gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      pill = false,
      block = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${pill ? '!rounded-full' : ''} ${block ? 'w-full' : ''} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
