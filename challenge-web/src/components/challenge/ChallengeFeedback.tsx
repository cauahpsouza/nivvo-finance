import { ArrowRight, CalendarClock, Route, Target } from 'lucide-react';
import { ChallengeFeedbackData } from '../../types/challenge';
import { formatCurrency } from '../../lib/formatters';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';

export function ChallengeFeedback({ feedback, day, boss = false, onContinue }: { feedback: ChallengeFeedbackData; day: number; boss?: boolean; onContinue: () => void }) {
  return (
    <main className="challenge-feedback-enter mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-6 sm:px-6" data-testid="challenge-feedback">
      <section className="nivvo-panel w-full border border-brand-800 bg-surface p-6 shadow-2xl sm:p-9">
        <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center border border-brand-800 bg-brand-900 text-accent-500"><Route size={24} /></span><div><p className="nivvo-kicker mb-2 text-brand-600">{boss ? 'Fechamento registrado' : 'Decisão registrada'}</p><h1 className="text-2xl font-black text-text-primary sm:text-3xl">{feedback.title}</h1><p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-base">{feedback.description}</p></div></div>
        <div className="my-6 grid grid-cols-3 border-y border-border py-5"><FeedbackValue label="Saldo" delta={signedCurrency(feedback.balanceDelta)} total={formatCurrency(feedback.balanceAfter)} /><FeedbackValue label="Meta" delta={signedCurrency(feedback.goalDelta)} total={formatCurrency(feedback.goalAfter)} positive={feedback.goalDelta > 0} /><FeedbackValue label="Organização" delta={`+${feedback.xp} XP`} total={`${feedback.commitmentsAfter ? formatCurrency(feedback.commitmentsAfter) : 'Sem'} pendências`} positive /></div>
        {feedback.commitmentCreated && <p className="mb-4 flex items-center gap-2 border-l-4 border-warning bg-[#FFF8E8] px-4 py-3 text-sm font-semibold text-[#6B4B0B]"><CalendarClock size={17} /> Esta escolha deixou um compromisso para depois.</p>}
        {feedback.goalReached && <p className="mb-4 flex items-center gap-2 border-l-4 border-accent-500 bg-brand-100/50 px-4 py-3 text-sm font-black text-brand-900"><Target size={17} /> Meta da semana alcançada</p>}
        <button onClick={onContinue} data-testid="challenge-next" className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 bg-brand-900 px-5 text-sm font-bold text-white transition-[background-color,transform] hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:translate-y-px">{boss ? 'Ver resultado' : day >= CHALLENGE_CONFIG.totalDays ? 'Ir para desafio final' : 'Próximo dia'} <ArrowRight size={18} /></button>
      </section>
    </main>
  );
}

function signedCurrency(value: number) { return value ? `${value > 0 ? '+' : '−'} ${formatCurrency(Math.abs(value))}` : '—'; }
function FeedbackValue({ label, delta, total, positive = false }: { label: string; delta: string; total: string; positive?: boolean }) {
  return <div className="min-w-0 border-r border-border px-2 last:border-r-0 sm:px-5"><p className="nivvo-kicker mb-2 truncate text-text-secondary">{label}</p><p className={`font-mono text-sm font-bold sm:text-lg ${positive ? 'text-brand-600' : 'text-text-primary'}`}>{delta}</p><p className="mt-1 truncate text-[10px] text-text-secondary">Agora: {total}</p></div>;
}
