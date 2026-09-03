import { AlertCircle, ArrowRight, CalendarClock, LoaderCircle } from 'lucide-react';
import { ChallengeChoice, ChallengeEvent, ChallengeRun } from '../../types/challenge';
import { isChallengeChoiceAvailable } from '../../lib/challenge/engine';
import { formatCurrency } from '../../lib/formatters';
import { WEEK_DAYS } from '../../lib/challenge/config';
import { cn } from '../../lib/utils';
import { CategoryGlyph, FinanceGlyphCategory } from '../finance/CategoryGlyph';
import type { CSSProperties } from 'react';

interface ChallengeSceneProps {
  run: ChallengeRun;
  event: ChallengeEvent;
  interactionReady: boolean;
  selectedChoiceId: string | null;
  onChoose: (choiceId: string) => void;
}

export function ChallengeScene({ run, event, interactionReady, selectedChoiceId, onChoose }: ChallengeSceneProps) {
  return (
    <main className="challenge-scene-enter mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center px-4 py-5 sm:px-6 lg:px-8" data-testid="challenge-scene">
      {run.currentConsequences.length > 0 && (
        <div className="mb-4 border-l-4 border-warning bg-[#FFF8E8] px-4 py-3 text-text-primary" role="status" data-testid="challenge-consequence">
          {run.currentConsequences.map(consequence => (
            <div key={consequence.id} className="flex items-start gap-3">
              <CalendarClock size={18} className="mt-0.5 shrink-0 text-[#8A5A00]" />
              <div><p className="nivvo-kicker mb-1 text-[#765000]">Efeito de uma escolha anterior</p><p className="text-sm font-bold">{consequence.title}</p><p className="text-xs text-text-secondary sm:text-sm">{consequence.description}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid items-stretch gap-5 lg:grid-cols-[.7fr_1.3fr] lg:gap-8">
        <section className="nivvo-panel flex min-h-52 flex-col justify-between border border-brand-800 bg-brand-900 p-6 text-white sm:p-8">
          <div>
            <div className="mb-7 flex items-center justify-between gap-4">
              <span className="nivvo-kicker text-accent-500">Dia {String(run.day).padStart(2, '0')} · {WEEK_DAYS[run.day - 1]}</span>
              <span className="flex items-center gap-2 text-brand-100/60"><CategoryGlyph category={toGlyphCategory(event.category)} size={18} /><span className="nivvo-kicker">{event.category}</span></span>
            </div>
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-brand-100/75 sm:text-base">{event.description}</p>
          </div>
        </section>

        <section className="flex flex-col justify-center" aria-labelledby="choice-title" aria-busy={!interactionReady}>
          <div className="mb-3 flex items-center justify-between gap-3"><p id="choice-title" className="nivvo-kicker text-brand-600">Sua decisão</p>{!interactionReady && <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary">Preparando escolhas</span>}</div>
          <div className="grid gap-3">
            {event.choices.map((choice, index) => <ChallengeChoiceButton key={choice.id} choice={choice} index={index} available={isChallengeChoiceAvailable(run, choice)} interactionReady={interactionReady} selected={selectedChoiceId === choice.id} run={run} onChoose={onChoose} />)}
          </div>
        </section>
      </div>
    </main>
  );
}

function ChallengeChoiceButton({ choice, index, available, interactionReady, selected, run, onChoose }: { choice: ChallengeChoice; index: number; available: boolean; interactionReady: boolean; selected: boolean; run: ChallengeRun; onChoose: (choiceId: string) => void }) {
  const previews = choicePreview(choice);
  const disabled = !available || !interactionReady;
  return (
    <button disabled={disabled} onClick={() => onChoose(choice.id)} data-testid={`challenge-choice-${choice.id}`} style={{ '--choice-index': index } as CSSProperties} className={cn('challenge-choice group grid min-h-[92px] w-full grid-cols-[36px_1fr_auto] items-center gap-3 border bg-surface p-4 text-left focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:p-5', selected ? 'border-brand-600 shadow-soft' : available ? 'border-border enabled:hover:-translate-y-0.5 enabled:hover:border-brand-600 enabled:hover:shadow-soft' : 'cursor-not-allowed border-border bg-[#EFF2F0] opacity-65', selectedChoiceState(selected, run.pendingChoiceId))}>
      <span className="flex h-8 w-8 items-center justify-center border border-brand-800 bg-brand-900 font-mono text-xs font-bold text-accent-500">{String(index + 1).padStart(2, '0')}</span>
      <span className="min-w-0"><span className="block text-sm font-black text-text-primary sm:text-base">{choice.label}</span><span className="mt-1 block text-xs leading-relaxed text-text-secondary sm:text-sm">{available ? choice.description : unavailableReason(choice, run)}</span></span>
      <span className="flex min-w-[76px] flex-col items-end gap-1">
        {previews.map(preview => <span key={preview.label} className={cn('font-mono text-[10px] font-bold sm:text-xs', preview.positive ? 'text-brand-600' : 'text-text-secondary')}>{preview.label}</span>)}
        {selected ? <LoaderCircle size={16} className="mt-1 animate-spin text-brand-600" /> : available && interactionReady ? <ArrowRight size={16} className="mt-1 text-brand-600 transition-transform group-hover:translate-x-1" /> : !available ? <AlertCircle size={16} className="text-text-secondary" /> : null}
      </span>
    </button>
  );
}

function selectedChoiceState(selected: boolean, pendingChoiceId: string | null) {
  return pendingChoiceId && !selected ? 'challenge-choice--dimmed' : '';
}

function choicePreview(choice: ChallengeChoice) {
  const result: Array<{ label: string; positive: boolean }> = [];
  const balance = choice.effects.balanceDelta ?? 0;
  const goal = choice.effects.goalDelta ?? 0;
  if (balance) result.push({ label: `${balance > 0 ? '+' : '−'} ${formatCurrency(Math.abs(balance))}`, positive: balance > 0 });
  if (goal) result.push({ label: `META ${goal > 0 ? '+' : '−'}${formatCurrency(Math.abs(goal))}`, positive: goal > 0 });
  if ((choice.effects.commitmentDelta ?? 0) > 0 || choice.scheduledEffects?.length) result.push({ label: 'EFEITO FUTURO', positive: false });
  return result;
}

function unavailableReason(choice: ChallengeChoice, run: ChallengeRun) {
  void choice;
  void run;
  return 'O saldo atual não cobre esta escolha.';
}

function toGlyphCategory(category: string): FinanceGlyphCategory {
  if (category === 'Organização') return 'Planejamento';
  if (category === 'Oportunidade') return 'Meta';
  return category as FinanceGlyphCategory;
}
