import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  children,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:translate-y-px focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 motion-reduce:transition-none motion-reduce:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        {
          "bg-brand-600 text-white hover:bg-brand-800 active:bg-brand-900": variant === 'primary',
          "bg-surface text-text-primary border border-border hover:bg-background active:bg-border": variant === 'secondary',
          "bg-transparent text-text-secondary hover:text-text-primary hover:bg-background": variant === 'tertiary',
          "bg-danger text-white hover:bg-red-600 active:bg-red-700": variant === 'danger',
          "h-10 px-4 text-sm": size === 'sm',
          "min-h-[44px] px-6 text-sm": size === 'md',
          "min-h-[48px] px-8 text-base": size === 'lg',
          "w-full": fullWidth,
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
