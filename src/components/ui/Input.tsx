import React, { InputHTMLAttributes, useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-bold text-text-primary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "min-h-[44px] px-4 rounded-xl border bg-surface text-text-primary text-base transition-colors focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-text-secondary/60 disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-danger focus:border-danger focus:ring-danger" : "border-border",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
