import { Clock3 } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';
import { cn } from '../../lib/utils';

interface Props { balance: number; goalAmount: number; xp: number; day: number; remainingMs: number; timerActive: boolean; commitments?: number }

export function ChallengeHUD({ balance, goalAmount, day, remainingMs, timerActive, commitments = 0 }: Props) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const tier = seconds <= 5 ? 'critical' : seconds <= 10 ? 'urgent' : seconds <= 20 ? 'attention' : 'calm';
  return (
    <section className="border-b border-white/10 bg-[#102B24] text-white" aria-label="Status da partida">
      <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
          <HudStat label="Saldo" testId="challenge-hud-balance" value={formatCurrency(balance)} note={commitments > 0 ? `${formatCurrency(commitments)} pendentes` : undefined} />
          <HudStat label="Meta" testId="challenge-hud-goal" value={formatCurrency(goalAmount)} note={`de ${formatCurrency(CHALLENGE_CONFIG.goalTarget)}`} />
          <div className={cn('challenge-timer min-w-[62px] text-right', `challenge-timer--${tier}`)}>
            <span className="nivvo-kicker flex items-center justify-end gap-1 text-brand-100/55"><Clock3 size={11} /> Tempo</span>
            <strong className="mt-1 block font-mono text-xl leading-none tabular-nums" role="timer" aria-label={`${seconds} segundos restantes${timerActive ? '' : ', pausado'}`} data-testid="challenge-timer">{timer}</strong>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <span className="nivvo-kicker shrink-0 text-brand-100/55">Dia {day} de {CHALLENGE_CONFIG.totalDays}</span>
          <div className="flex flex-1 gap-1" role="progressbar" aria-label={`Dia ${day} de ${CHALLENGE_CONFIG.totalDays}`} aria-valuemin={1} aria-valuemax={CHALLENGE_CONFIG.totalDays} aria-valuenow={day} data-testid="challenge-hud-day">
            {Array.from({ length: CHALLENGE_CONFIG.totalDays }, (_, index) => <span key={index} className={`h-1 flex-1 ${index < day ? 'bg-accent-500' : 'bg-brand-800'}`} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function HudStat({ label, value, note, testId }: { label: string; value: string; note?: string; testId: string }) {
  return <div className="min-w-0"><span className="nivvo-kicker text-brand-100/55">{label}</span><strong className="mt-1 block truncate font-mono text-sm leading-none sm:text-base" data-testid={testId}>{value}</strong>{note ? <small className="mt-1 block truncate font-mono text-[8px] text-brand-100/45">{note}</small> : null}</div>;
}
