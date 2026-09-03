import { ChallengeRank } from '../../types/challenge';

export const CHALLENGE_SCHEMA_VERSION = 3;
export const CHALLENGE_RUN_STORAGE_KEY = 'nivvo-challenge-v3';
export const CHALLENGE_CONFIG = {
  startingBalance: 680,
  goalTarget: 180,
  totalDays: 7,
  decisionTimeLimitMs: 120_000,
  nicknameMaxLength: 20,
  healthyLiquidity: { minRatio: 0.18, idealRatio: 0.35, maxRatio: 0.5, highReserveFloor: 55 },
  commitmentReference: 180,
  initialMetrics: { planning: 50, commitments: 50 },
} as const;
export const CHALLENGE_XP = { decision: 10, plannedChoice: 20, goalContribution: 25, commitmentResolved: 20, futureEffectResolved: 15, finalDecisionCompleted: 80 } as const;
export const RANK_RULES: Array<{ rank: ChallengeRank; minScore: number; label: string }> = [
  { rank: 'S', minScore: 88, label: 'Meta alta, contas resolvidas e dinheiro para terminar a semana.' },
  { rank: 'A', minScore: 68, label: 'A maior parte da semana ficou em ordem.' },
  { rank: 'B', minScore: 45, label: 'A semana terminou com alguns ajustes pela frente.' },
  { rank: 'C', minScore: 0, label: 'Ficaram contas ou decisões importantes em aberto.' },
];
export const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;
