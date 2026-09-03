import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-surface rounded-[20px] p-5 sm:p-6 shadow-soft border border-border", className)} {...props}>
      {children}
    </div>
  );
}

export function CardSmall({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-surface rounded-2xl p-4 border border-border", className)} {...props}>
      {children}
    </div>
  );
}
