import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'neutral' }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold",
      {
        "bg-brand-100 text-brand-800": variant === 'default' || variant === 'success',
        "bg-warning/20 text-warning": variant === 'warning',
        "bg-gray-100 text-gray-800": variant === 'neutral',
      },
      className
    )}>
      {children}
    </span>
  );
}
