import { ChallengeRank } from '../../types/challenge';
import { cn } from '../../lib/utils';

const rankColors: Record<ChallengeRank, string> = {
  C: 'border-[#87948F] bg-[#DDE3E0] text-[#46534E]',
  B: 'border-brand-500 bg-brand-100 text-brand-900',
  A: 'border-accent-500 bg-brand-900 text-accent-500',
  S: 'border-accent-500 bg-accent-500 text-brand-900',
};

export function RankEmblem({ rank, className }: { rank: ChallengeRank; className?: string }) {
  return (
    <div className={cn('nivvo-panel relative flex h-24 w-24 items-center justify-center border-2', rankColors[rank], className)} aria-label={`Emblema Rank ${rank}`}>
      <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M16 18h52l12 12v48H28L16 66V18Z" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
        <path d="M25 27h36l10 10M25 68h38" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m70 19 9 9v11" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      <span className="relative font-mono text-5xl font-black">{rank}</span>
    </div>
  );
}
