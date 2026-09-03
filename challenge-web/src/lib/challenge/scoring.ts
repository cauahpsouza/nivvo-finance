import { ChallengeRank, ChallengeResult, ChallengeRun, ChallengeScoreBreakdown } from '../../types/challenge';
import { CHALLENGE_CONFIG, RANK_RULES } from './config';
import { getChallengeDecisionTimeUsedMs } from './timer';

export const clampScore = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

function calculateLiquidity(run: ChallengeRun) {
  const { minRatio, idealRatio, maxRatio, highReserveFloor } = CHALLENGE_CONFIG.healthyLiquidity;
  const usableBalance = Math.max(0, run.balance - run.commitments);
  const ratio = usableBalance / CHALLENGE_CONFIG.startingBalance;

  if (ratio < minRatio) return clampScore((ratio / minRatio) * 65);
  if (ratio <= idealRatio) return clampScore(65 + ((ratio - minRatio) / (idealRatio - minRatio)) * 35);
  if (ratio <= maxRatio) return clampScore(100 - ((ratio - idealRatio) / (maxRatio - idealRatio)) * 10);
  return clampScore(90 - ((Math.min(ratio, 1) - maxRatio) / (1 - maxRatio)) * (90 - highReserveFloor));
}

export function calculateChallengeScore(run: ChallengeRun): { score: number; breakdown: ChallengeScoreBreakdown } {
  const goal = clampScore((run.goalAmount / CHALLENGE_CONFIG.goalTarget) * 100);
  const openCommitmentPenalty = Math.min(55, (run.commitments / CHALLENGE_CONFIG.commitmentReference) * 55);
  const commitments = clampScore(run.metrics.commitments - openCommitmentPenalty);
  const liquidity = calculateLiquidity(run);
  const planning = clampScore(run.metrics.planning);
  const rawScore = Math.round(goal * 0.35 + commitments * 0.25 + liquidity * 0.2 + planning * 0.2);

  let score = clampScore(rawScore);
  if (commitments < 40 || liquidity < 35 || goal < 35 || planning < 35) score = Math.min(score, 67);
  if (score >= 88 && (goal < 85 || commitments < 75 || liquidity < 60 || planning < 75)) score = 87;
  return { score, breakdown: { goal, commitments, liquidity, planning } };
}

export function calculateChallengeRank(score: number): { rank: ChallengeRank; label: string } {
  const safeScore = clampScore(score);
  const rule = RANK_RULES.find(item => safeScore >= item.minScore) ?? RANK_RULES[RANK_RULES.length - 1];
  return { rank: rule.rank, label: rule.label };
}

function simpleHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createNivvoId(runId: string): string {
  const code = simpleHash(runId).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `NV-${code}`;
}

export function createChallengeResult(run: ChallengeRun, nowMs?: number): ChallengeResult {
  const { score, breakdown } = calculateChallengeScore(run);
  const rank = calculateChallengeRank(score);
  const effectiveNow = nowMs ?? run.decisionTimer.activeSinceMs ?? 0;
  return {
    score,
    rank: rank.rank,
    rankLabel: rank.label,
    breakdown,
    nivvoId: createNivvoId(run.id),
    decisionTimeUsed: getChallengeDecisionTimeUsedMs(run, effectiveNow),
    timedOut: run.timedOut,
  };
}
