import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  progress: number;
  className?: string;
  barClassName?: string;
  ariaLabel?: string;
}

export function ProgressBar({ progress, className, barClassName, ariaLabel }: ProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(100, Number.isNaN(progress) ? 0 : progress));
  
  return (
    <div
      className={cn("w-full h-2 bg-brand-100 rounded-full overflow-hidden", className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={safeProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full bg-brand-500 transition-[width] duration-500 ease-out motion-reduce:transition-none rounded-full", barClassName)}
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  );
}
