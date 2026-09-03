'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useChallenge } from '../../context/ChallengeContext';
import { useChallengeRuntime } from '../../hooks/useChallengeRuntime';
import { getChallengeBoss } from '../../lib/challenge/bosses';
import { getCurrentChallengeEvent } from '../../lib/challenge/engine';
import { ChallengeBoss } from './ChallengeBoss';
import { ChallengeBossIntro } from './ChallengeBossIntro';
import { ChallengeFeedback } from './ChallengeFeedback';
import { ChallengeHeader } from './ChallengeHeader';
import { ChallengeHUD } from './ChallengeHUD';
import { ChallengeIntro } from './ChallengeIntro';
import { ChallengeResults } from './ChallengeResults';
import { ChallengeScene } from './ChallengeScene';
import { ChallengeTimeExpired } from './ChallengeTimeExpired';
import { ChallengeTransition } from './ChallengeTransition';

export function ChallengeExperience() {
  const challenge = useChallenge();
  const [entered, setEntered] = useState(false);
  const run = challenge.state.run;
  const runtime = useChallengeRuntime({ run, active: entered, resumeTimer: challenge.resumeTimer, pauseTimer: challenge.pauseTimer, expireTimer: challenge.expireTimer, resolveChoice: challenge.resolveChoice, resolveBoss: challenge.resolveBoss, finishTransition: challenge.finishTransition, finishBossIntro: challenge.finishBossIntro });
  if (!challenge.state.hydrated) return <div className="challenge-loading"><span>Preparando desafio</span></div>;
  if (!entered || !run) return <ChallengeIntro existingRun={run} onStart={name => { challenge.startChallenge(name); setEntered(true); }} onContinue={() => setEntered(true)} />;
  if (run.phase === 'results') return <ChallengeResults run={run} />;
  const event = getCurrentChallengeEvent(run);
  const finalDecision = getChallengeBoss(run.bossId ?? '');
  const eventPhase = run.phase === 'playing' || run.phase === 'resolving';
  const finalPhase = run.phase === 'boss' || run.phase === 'boss-resolving';
  if ((eventPhase && !event) || ((finalPhase || run.phase === 'boss-intro') && !finalDecision)) return <Recovery />;
  const dark = finalPhase || ['boss-intro', 'transition', 'time-expired'].includes(run.phase);
  const showHud = !['transition', 'boss-intro', 'time-expired'].includes(run.phase);
  return (
    <div className={`challenge-screen flex flex-col ${dark ? 'bg-brand-900' : 'bg-background'}`}>
      <ChallengeHeader day={run.day} />
      {challenge.persistenceError ? <div className="persistence-warning" role="alert">{challenge.persistenceError}</div> : null}
      {showHud ? <ChallengeHUD balance={run.balance} goalAmount={run.goalAmount} xp={run.xp} day={run.day} commitments={run.commitments} remainingMs={runtime.remainingMs} timerActive={runtime.interactionReady} /> : null}
      {eventPhase && event ? <ChallengeScene run={run} event={event} interactionReady={runtime.interactionReady} selectedChoiceId={run.pendingChoiceId} onChoose={challenge.choose} /> : null}
      {run.phase === 'feedback' && run.currentFeedback ? <ChallengeFeedback feedback={run.currentFeedback} day={run.day} onContinue={challenge.nextDay} /> : null}
      {run.phase === 'transition' ? <ChallengeTransition day={run.day} consequences={run.currentConsequences} /> : null}
      {run.phase === 'boss-intro' && finalDecision ? <ChallengeBossIntro boss={finalDecision} /> : null}
      {finalPhase && finalDecision ? <ChallengeBoss run={run} boss={finalDecision} interactionReady={runtime.interactionReady} selectedChoiceId={run.pendingChoiceId} onChoose={challenge.chooseBoss} /> : null}
      {run.phase === 'boss-feedback' && run.currentFeedback ? <ChallengeFeedback feedback={run.currentFeedback} day={run.day} boss onContinue={challenge.revealResults} /> : null}
      {run.phase === 'time-expired' ? <ChallengeTimeExpired decisionsMade={run.decisions.length} onContinue={challenge.revealResults} /> : null}
    </div>
  );
}

function Recovery() { return <div className="challenge-loading"><AlertTriangle /><strong>Não foi possível continuar.</strong><span>Atualize a página para recuperar seu progresso.</span></div>; }
