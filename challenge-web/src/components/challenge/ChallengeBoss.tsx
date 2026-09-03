import { AlertTriangle, ArrowRight, Gauge, LoaderCircle } from 'lucide-react';
import { ChallengeBoss as ChallengeBossType, ChallengeBossChoice, ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';
import { isChallengeChoiceAvailable } from '../../lib/challenge/engine';
import { formatCurrency } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { CSSProperties } from 'react';

interface ChallengeBossProps {
  run: ChallengeRun;
  boss: ChallengeBossType;
  interactionReady: boolean;
  selectedChoiceId: string | null;
  onChoose: (choiceId: string) => void;
}

export function ChallengeBoss({ run, boss, interactionReady, selectedChoiceId, onChoose }: ChallengeBossProps) {
  const pressure = Math.min(100, Math.max(18, (run.commitments / CHALLENGE_CONFIG.commitmentReference) * 65 + (1 - run.balance / CHALLENGE_CONFIG.startingBalance) * 35));
  return (
    <main className="challenge-boss-enter challenge-grid relative flex flex-1 items-center overflow-hidden px-4 py-6 sm:px-6 lg:px-8" data-testid="challenge-boss">
      <div className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[.82fr_1.18fr]">
        <section className="nivvo-panel border border-accent-500 bg-[#071612] p-6 text-white sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-4"><span className="nivvo-kicker text-accent-500">Desafio final</span><AlertTriangle size={20} className="text-accent-500" /></div>
          <p className="font-mono text-xs font-bold uppercase tracking-[.22em] text-brand-100/55">{boss.title}</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">Última decisão</h1>
          <p className="mt-5 text-sm leading-relaxed text-brand-100/75 sm:text-base">{boss.description}</p>
          <p className="mt-3 text-sm font-semibold text-white">{boss.context}</p>
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="mb-2 flex justify-between font-mono text-[10px] font-bold text-brand-100/60"><span className="flex items-center gap-2"><Gauge size={14} /> Pressão financeira</span><span>{Math.round(pressure)}%</span></div>
            <div className="nivvo-segments h-3 bg-brand-800"><div className="h-full bg-accent-500 transition-[width] duration-500" style={{ width: `${pressure}%` }} /></div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5"><BossStat label="Saldo" value={formatCurrency(run.balance)} /><BossStat label="Meta" value={`${formatCurrency(run.goalAmount)} / ${formatCurrency(CHALLENGE_CONFIG.goalTarget)}`} /><BossStat label="Pendências" value={formatCurrency(run.commitments)} /></div>
          </div>
        </section>

        <section className="flex flex-col justify-center" aria-busy={!interactionReady}>
          <div className="mb-3 flex items-center justify-between gap-3"><p className="nivvo-kicker text-accent-500">Escolha final</p>{!interactionReady && <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-100/50">Preparando escolhas</span>}</div>
          <div className="space-y-3">
            {boss.choices.map((choice, index) => <BossChoiceButton key={choice.id} run={run} choice={choice} index={index} available={isChallengeChoiceAvailable(run, choice)} interactionReady={interactionReady} selected={selectedChoiceId === choice.id} onChoose={onChoose} />)}
          </div>
        </section>
      </div>
    </main>
  );
}

function BossChoiceButton({ run, choice, index, available, interactionReady, selected, onChoose }: { run: ChallengeRun; choice: ChallengeBossChoice; index: number; available: boolean; interactionReady: boolean; selected: boolean; onChoose: (id: string) => void }) {
  const disabled = !available || !interactionReady;
  return (
    <button disabled={disabled} onClick={() => onChoose(choice.id)} data-testid={`challenge-boss-choice-${choice.id}`} style={{ '--choice-index': index } as CSSProperties} className={cn('challenge-choice group grid min-h-[94px] w-full grid-cols-[36px_1fr_auto] items-center gap-3 border bg-[#102B24] p-4 text-left text-white focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:cursor-not-allowed sm:p-5', selected ? 'border-accent-500' : 'border-white/15 enabled:hover:-translate-y-0.5 enabled:hover:border-accent-500', !available && 'opacity-40', run.pendingChoiceId && !selected && 'challenge-choice--dimmed')}>
      <span className="flex h-8 w-8 items-center justify-center border border-accent-500 font-mono text-xs font-bold text-accent-500">{String(index + 1).padStart(2, '0')}</span>
      <span><span className="block text-sm font-black sm:text-base">{choice.label}</span><span className="mt-1 block text-xs text-brand-100/65 sm:text-sm">{available ? choice.description : choice.requiresGoalAmount && run.goalAmount < choice.requiresGoalAmount ? 'Sua meta não possui este valor disponível.' : 'Seu saldo não cobre esta escolha.'}</span></span>
      <span className="text-accent-500">{selected ? <LoaderCircle size={17} className="animate-spin" /> : available && interactionReady ? <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /> : null}</span>
    </button>
  );
}

function BossStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="nivvo-kicker mb-2 truncate text-brand-100/50">{label}</p><p className="truncate font-mono text-xs font-bold text-white sm:text-sm">{value}</p></div>;
}
