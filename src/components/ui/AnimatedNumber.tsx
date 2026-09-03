"use client";

import { useEffect, useRef, useState } from 'react';
import { MOTION_MS } from '../../lib/motion';

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

const easeOutQuint = (progress: number) => 1 - Math.pow(1 - progress, 5);

export function AnimatedNumber({
  value,
  format = current => Math.round(current).toString(),
  duration = MOTION_MS.smooth,
  className,
  ariaLabel,
  testId,
}: AnimatedNumberProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const previousValue = useRef(safeValue);
  const [displayValue, setDisplayValue] = useState(safeValue);

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = safeValue;
    let frame = 0;

    if (from === safeValue || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame = requestAnimationFrame(() => setDisplayValue(safeValue));
      return () => cancelAnimationFrame(frame);
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplayValue(from + (safeValue - from) * easeOutQuint(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, safeValue]);

  return (
    <span className={className} aria-label={ariaLabel ?? format(safeValue)} data-testid={testId}>
      <span aria-hidden="true">{format(displayValue)}</span>
    </span>
  );
}
