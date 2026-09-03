import { BarChart3, Clock3 } from 'lucide-react';
import { ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';
import { formatCurrency } from '../../lib/formatters';
import { ChallengeHeader } from './ChallengeHeader';
import { NivvoIDCard } from './NivvoIDCard';
import { RankEmblem } from './RankEmblem';

export function ChallengeResults({ run }: { run: ChallengeRun }) {
  if (!run.result) return null;
  const progress = Math.round(run.goalAmount / CHALLENGE_CONFIG.goalTarget * 100);
  return (
    <div className="challenge-screen result-screen bg-brand-900 text-white" data-testid="challenge-results">
      <ChallengeHeader day={CHALLENGE_CONFIG.totalDays} />
      <main className="result-shell">
        <header className="result-title challenge-result-stage challenge-result-stage-1">
          <div><p className="nivvo-kicker text-accent-500">{run.result.timedOut ? 'Tempo encerrado' : 'Semana concluída'}</p><h1>Seu resultado</h1><p>{resultSummary(run)}</p></div>
          <div className="result-score"><RankEmblem rank={run.result.rank} className="h-20 w-20" /><div><span>Score</span><strong>{run.result.score}<small>/100</small></strong></div></div>
        </header>
        <section className="result-grid">
          <div className="challenge-result-stage challenge-result-stage-2">
            <div className="result-stats"><Stat label="Meta" value={`${progress}%`} /><Stat label="Saldo" value={formatCurrency(run.balance)} /><Stat label="Tempo" value={formatTime(run.result.decisionTimeUsed)} icon /></div>
            <div className="result-breakdown">
              <div className="result-section-title"><p className="nivvo-kicker text-accent-500">Resumo da semana</p><BarChart3 size={17} /></div>
              <ScoreLine label="Meta" value={run.result.breakdown.goal} /><ScoreLine label="Contas" value={run.result.breakdown.commitments} /><ScoreLine label="Dinheiro restante" value={run.result.breakdown.liquidity} /><ScoreLine label="Planejamento" value={run.result.breakdown.planning} />
              <p className="decision-count">{run.decisions.length} decisões concluídas</p>
            </div>
          </div>
          <div className="challenge-result-stage challenge-result-stage-3"><NivvoIDCard run={run} /></div>
        </section>
      </main>
    </div>
  );
}

function resultSummary(run: ChallengeRun) {
  if (!run.result) return '';
  if (run.result.timedOut) return 'O relógio parou. Seu resultado considera tudo o que você decidiu.';
  if (run.result.rank === 'S') return 'Você protegeu a meta, resolveu as contas e terminou com fôlego.';
  if (run.result.rank === 'A') return 'Você manteve a semana em ordem e chegou perto do melhor equilíbrio.';
  if (run.result.rank === 'B') return 'Você chegou ao fim, mas algumas escolhas ainda pediam ajuste.';
  return 'A semana terminou, mas decisões importantes ficaram em aberto.';
}
function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) { return <div><span>{label}</span><strong>{icon && <Clock3 size={12} />}{value}</strong></div>; }
function ScoreLine({ label, value }: { label: string; value: number }) { return <div className="score-line"><span>{label}</span><b>{Math.round(value)}</b><div><i style={{ '--score-width': `${Math.max(0, Math.min(100, value))}%` } as React.CSSProperties} /></div></div>; }
function formatTime(ms: number) { const seconds = Math.round(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
