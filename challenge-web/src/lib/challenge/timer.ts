import { ChallengeDecisionTimer, ChallengePhase, ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG } from './config';

export const CHALLENGE_TIMER_ACTIVE_PHASES: readonly ChallengePhase[] = ['playing', 'boss'];

const clampMilliseconds = (value: number): number => Math.max(
  0,
  Math.min(CHALLENGE_CONFIG.decisionTimeLimitMs, Number.isFinite(value) ? value : 0),
);

export function createChallengeDecisionTimer(): ChallengeDecisionTimer {
  return {
    remainingMs: CHALLENGE_CONFIG.decisionTimeLimitMs,
    activeSinceMs: null,
  };
}

export function isChallengeTimerPhase(phase: ChallengePhase): boolean {
  return CHALLENGE_TIMER_ACTIVE_PHASES.includes(phase);
}

export function getChallengeTimerRemainingMs(
  run: Pick<ChallengeRun, 'decisionTimer'>,
  nowMs: number,
): number {
  const snapshot = clampMilliseconds(run.decisionTimer.remainingMs);
  const activeSince = run.decisionTimer.activeSinceMs;
  if (activeSince === null || !Number.isFinite(activeSince)) return snapshot;

  const safeNow = Number.isFinite(nowMs) ? nowMs : activeSince;
  const elapsed = Math.max(0, safeNow - activeSince);
  return clampMilliseconds(snapshot - elapsed);
}

export function getChallengeDecisionTimeUsedMs(
  run: Pick<ChallengeRun, 'decisionTimer'>,
  nowMs: number,
): number {
  return CHALLENGE_CONFIG.decisionTimeLimitMs - getChallengeTimerRemainingMs(run, nowMs);
}

export function isChallengeTimerExpired(
  run: Pick<ChallengeRun, 'decisionTimer'>,
  nowMs: number,
): boolean {
  return getChallengeTimerRemainingMs(run, nowMs) <= 0;
}

export function pauseChallengeTimer(run: ChallengeRun, nowMs: number): ChallengeRun {
  const remainingMs = getChallengeTimerRemainingMs(run, nowMs);
  if (run.decisionTimer.activeSinceMs === null && run.decisionTimer.remainingMs === remainingMs) return run;

  return {
    ...run,
    decisionTimer: {
      remainingMs,
      activeSinceMs: null,
    },
  };
}

export function resumeChallengeTimer(run: ChallengeRun, nowMs: number): ChallengeRun {
  if (
    !isChallengeTimerPhase(run.phase)
    || run.timedOut
    || run.result !== null
    || run.decisionTimer.activeSinceMs !== null
    || !Number.isFinite(run.decisionTimer.remainingMs)
    || run.decisionTimer.remainingMs <= 0
    || !Number.isFinite(nowMs)
  ) {
    return run;
  }

  return {
    ...run,
    decisionTimer: {
      remainingMs: clampMilliseconds(run.decisionTimer.remainingMs),
      activeSinceMs: nowMs,
    },
  };
}
