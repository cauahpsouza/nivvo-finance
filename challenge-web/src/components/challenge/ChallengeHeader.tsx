import { LogoLockup } from '../ui/logo';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';

export function ChallengeHeader({ day }: { day?: number }) {
  return (
    <header className="challenge-header">
      <LogoLockup className="h-6 sm:h-7" variant="white" />
      <span className="nivvo-kicker text-brand-100/55">Desafio</span>
      {day ? <span className="ml-auto font-mono text-[10px] font-bold text-brand-100/55">DIA {day} DE {CHALLENGE_CONFIG.totalDays}</span> : null}
    </header>
  );
}
