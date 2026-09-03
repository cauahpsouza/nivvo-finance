import { AppliedConsequence } from '../../types/challenge';
import { WEEK_DAYS } from '../../lib/challenge/config';

export function ChallengeTransition({ day, consequences }: { day: number; consequences: AppliedConsequence[] }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 text-center text-white" data-testid="challenge-transition" aria-live="polite">
      <div className="challenge-day-enter">
        <p className="nivvo-kicker mb-5 text-brand-100/60">Próxima decisão</p>
        <p className="font-mono text-7xl font-black text-accent-500 sm:text-9xl">{String(day).padStart(2, '0')}</p>
        <h1 className="mt-3 text-xl font-black uppercase tracking-widest sm:text-2xl">{WEEK_DAYS[day - 1]}</h1>
        {consequences.length > 0 && <p className="mt-6 text-sm text-brand-100/70">Uma escolha anterior terá efeito neste dia.</p>}
      </div>
    </main>
  );
}
