import React from 'react';
import { BookOpen, CarFront, Check, House, Plane, Shield, Sparkles, Target } from 'lucide-react';
import { GoalIcon } from '../../types';

const iconMap = { plane: Plane, book: BookOpen, shield: Shield, home: House, vehicle: CarFront, sparkles: Sparkles, target: Target };

export function GoalEmblem({ completed = false, icon = 'monitor' }: { completed?: boolean; icon?: GoalIcon }) {
  if (completed) {
    return (
      <div className="nivvo-panel flex h-24 w-24 shrink-0 items-center justify-center border border-brand-800 bg-brand-900 text-accent-500">
        <Check size={46} strokeWidth={2.5} />
      </div>
    );
  }

  if (icon !== 'monitor') {
    const Icon = iconMap[icon];
    return (
      <div className="nivvo-panel flex h-24 w-24 shrink-0 items-center justify-center border border-brand-800 bg-brand-900 text-white">
        <Icon size={44} strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <div className="nivvo-panel flex h-24 w-24 shrink-0 items-center justify-center border border-brand-800 bg-brand-900 text-white">
      <svg viewBox="0 0 80 80" className="h-16 w-16" aria-label="Computador">
        <path d="M12 16h56v38H12z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M19 23h42v24H19z" fill="var(--color-brand-800)" />
        <path d="m24 42 11-11 8 8 7-7 7 7" fill="none" stroke="var(--color-accent-500)" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 54v10m-13 0h26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
