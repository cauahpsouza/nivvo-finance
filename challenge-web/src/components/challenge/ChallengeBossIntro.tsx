import { AlertTriangle } from 'lucide-react';
import { ChallengeBoss } from '../../types/challenge';

export function ChallengeBossIntro({ boss }: { boss: ChallengeBoss }) {
  return (
    <main className="challenge-grid relative flex flex-1 items-center justify-center overflow-hidden px-4 text-center text-white" aria-live="polite" data-testid="challenge-boss-intro">
      <div className="challenge-boss-intro relative z-10 max-w-xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center border border-accent-500 text-accent-500"><AlertTriangle size={26} /></span>
        <p className="nivvo-kicker mt-7 text-accent-500">Fechamento da semana</p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight sm:text-6xl">Desafio final</h1>
        <p className="mt-4 font-mono text-sm font-bold uppercase tracking-[.18em] text-brand-100/60">{boss.title}</p>
      </div>
    </main>
  );
}
