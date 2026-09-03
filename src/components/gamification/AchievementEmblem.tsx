import React from 'react';
import { AchievementCategory } from '../../types';
import { cn } from '../../lib/utils';

interface AchievementEmblemProps {
  achievementId: string;
  category?: AchievementCategory;
  locked?: boolean;
  className?: string;
}

const categoryByPrefix: Record<string, AchievementCategory> = {
  org: 'Organização',
  goal: 'Metas',
  streak: 'Consistência',
  eco: 'Economia',
  explore: 'Exploração',
};

export function AchievementEmblem({ achievementId, category, locked = false, className }: AchievementEmblemProps) {
  const prefix = achievementId.split('-')[0];
  const resolvedCategory = category ?? categoryByPrefix[prefix] ?? 'Exploração';
  const code = achievementId.split('-').at(-1)?.padStart(2, '0') ?? '00';
  const pathProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const accentStroke = locked ? 'currentColor' : 'var(--color-accent-500)';

  return (
    <div className={cn(
      'nivvo-panel relative flex h-16 w-16 shrink-0 items-center justify-center border',
      locked ? 'border-border bg-[#EEF1EF] text-[#89938F]' : 'border-brand-800 bg-brand-900 text-white',
      className,
    )}>
      <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
        {resolvedCategory === 'Organização' && (
          <><path d="M17 9h30v46l-5-3-5 3-5-3-5 3-5-3-5 3V9Z" {...pathProps} /><path d="M24 20h16M24 27h10" {...pathProps} stroke={accentStroke} /></>
        )}
        {resolvedCategory === 'Metas' && (
          <><circle cx="31" cy="33" r="19" {...pathProps} /><circle cx="31" cy="33" r="10" {...pathProps} stroke={accentStroke} /><path d="m35 29 15-15m0 0v9m0-9h-9" {...pathProps} /></>
        )}
        {resolvedCategory === 'Consistência' && (
          <><path d="M17 13h30v38H17zM23 8v10m18-10v10M17 23h30" {...pathProps} /><path d="m24 36 5 5 11-12" {...pathProps} stroke={accentStroke} /></>
        )}
        {resolvedCategory === 'Economia' && (
          <><path d="M32 7 50 15v14c0 12-8 21-18 27-10-6-18-15-18-27V15l18-8Z" {...pathProps} /><circle cx="32" cy="30" r="9" {...pathProps} stroke={accentStroke} /><path d="M32 24v12m-4-8h6a3 3 0 0 1 0 6h-6" {...pathProps} /></>
        )}
        {resolvedCategory === 'Exploração' && (
          <><circle cx="32" cy="32" r="21" {...pathProps} /><path d="m38 26-4 10-10 4 4-10 10-4Z" {...pathProps} stroke={accentStroke} /><circle cx="32" cy="32" r="2" fill="currentColor" /></>
        )}
      </svg>
      <span className={cn('absolute bottom-1.5 right-2 font-mono text-[9px] font-bold', locked ? 'text-text-secondary' : 'text-accent-500')}>{code}</span>
    </div>
  );
}
