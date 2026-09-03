import { ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';
import { formatCurrency } from '../../lib/formatters';
import { RankEmblem } from './RankEmblem';

export function NivvoIDCard({ run }: { run: ChallengeRun }) {
  if (!run.result) return null;
  const goalProgress = Math.round((run.goalAmount / CHALLENGE_CONFIG.goalTarget) * 100);
  return (
    <section className="nivvo-panel border border-accent-500 bg-[#102B24] p-5 text-white sm:p-6" data-testid="challenge-nivvo-id" aria-label={`Nivvo ID de ${run.nickname}`}>
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4"><div><p className="nivvo-kicker mb-2 text-accent-500">Nivvo ID · semana</p><p className="font-mono text-xl font-black tracking-wider sm:text-2xl">{run.result.nivvoId}</p></div><RankEmblem rank={run.result.rank} className="h-16 w-16" /></div>
      <p className="truncate text-xl font-black uppercase tracking-tight sm:text-2xl">{run.nickname}</p><p className="mt-1 font-mono text-xs font-bold text-accent-500">RANK {run.result.rank} · {run.result.score}/100</p>
      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-4"><IdValue label="Meta" value={`${goalProgress}%`} /><IdValue label="Saldo" value={formatCurrency(run.balance)} /><IdValue label="XP" value={`${run.xp}`} /><IdValue label="Decisões" value={`${run.decisions.length}`} /><IdValue label="Resolvidos" value={`${run.commitmentsResolved}`} /><IdValue label="Pendências" value={formatCurrency(run.commitments)} /></div>
    </section>
  );
}
function IdValue({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="nivvo-kicker mb-1 truncate text-brand-100/45">{label}</p><p className="truncate font-mono text-sm font-bold text-white">{value}</p></div>; }
