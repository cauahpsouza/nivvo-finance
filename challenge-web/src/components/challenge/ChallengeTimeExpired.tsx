import { ArrowRight, Clock3 } from 'lucide-react';

export function ChallengeTimeExpired({ decisionsMade, onContinue }: { decisionsMade: number; onContinue: () => void }) {
  return (
    <main className="challenge-grid relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 text-white" data-testid="challenge-time-expired">
      <section className="challenge-feedback-enter relative z-10 w-full max-w-lg border border-warning bg-[#102B24] p-7 text-center sm:p-9">
        <Clock3 size={34} className="mx-auto text-warning" />
        <p className="nivvo-kicker mt-5 text-warning">Tempo encerrado</p>
        <h1 className="mt-3 text-3xl font-black uppercase">A semana foi fechada</h1>
        <p className="mt-4 text-sm leading-relaxed text-brand-100/70">O resultado considera as {decisionsMade} decisões que você concluiu. Nenhuma escolha automática foi registrada.</p>
        <button onClick={onContinue} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-accent-500 px-5 text-sm font-black text-brand-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900">Ver resultado <ArrowRight size={18} /></button>
      </section>
    </main>
  );
}
