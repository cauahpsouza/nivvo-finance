export type ChallengePhase = 'playing' | 'feedback' | 'resolving' | 'transition' | 'boss-intro' | 'boss' | 'boss-feedback' | 'boss-resolving' | 'time-expired' | 'results';
export type ChallengeRank = 'C' | 'B' | 'A' | 'S';
export type ChallengeMetric = 'planning' | 'commitments';
export type ChallengeEventKind = 'flexible' | 'necessary' | 'positive' | 'saving' | 'consequence';
export interface ChallengeMetricValues { planning: number; commitments: number }
export interface ChallengeEffects { balanceDelta?: number; goalDelta?: number; xp?: number; commitmentDelta?: number; metrics?: Partial<ChallengeMetricValues>; tags?: string[] }
export interface ScheduledEffectTemplate { id: string; delayDays: number; title: string; description: string; effects: ChallengeEffects }
export interface ChallengeChoice { id: string; label: string; description: string; feedback: string; effects: ChallengeEffects; scheduledEffects?: ScheduledEffectTemplate[]; allowShortfallAsCommitment?: boolean }
export interface ChallengeEvent { id: string; title: string; description: string; category: string; kind: ChallengeEventKind; choices: ChallengeChoice[] }
export interface ScheduledEffect { id: string; sourceEventId: string; sourceChoiceId: string; dueDay: number; title: string; description: string; effects: ChallengeEffects; applied: boolean }
export interface ChallengeDecision { day: number; eventId: string; choiceId: string; choiceLabel: string; balanceDelta: number; goalDelta: number; xp: number; tags: string[] }
export interface ChallengeFeedbackData { title: string; description: string; balanceDelta: number; goalDelta: number; xp: number; commitmentCreated: boolean; goalReached: boolean; balanceAfter: number; goalAfter: number; commitmentsAfter: number }
export interface AppliedConsequence { id: string; title: string; description: string; balanceDelta: number; goalDelta: number; xp: number }
export interface ChallengeBossChoice extends ChallengeChoice { requiresGoalAmount?: number; commitmentPaymentRatio?: number; maxCommitmentPayment?: number }
export interface ChallengeBoss { id: string; title: string; description: string; context: string; choices: ChallengeBossChoice[] }
export interface ChallengeScoreBreakdown { goal: number; commitments: number; liquidity: number; planning: number }
export interface ChallengeResult { score: number; rank: ChallengeRank; rankLabel: string; breakdown: ChallengeScoreBreakdown; nivvoId: string; decisionTimeUsed: number; timedOut: boolean }
export interface ChallengeDecisionTimer { remainingMs: number; activeSinceMs: number | null }
export interface ChallengeRun {
  id: string; seed: number; nickname: string; phase: ChallengePhase; day: number; balance: number; goalAmount: number; xp: number; eventIds: string[];
  decisions: ChallengeDecision[]; scheduledEffects: ScheduledEffect[]; appliedEffectIds: string[]; commitments: number; metrics: ChallengeMetricValues;
  tags: string[]; commitmentsResolved: number; pendingChoiceId: string | null; decisionTimer: ChallengeDecisionTimer; timedOut: boolean;
  currentFeedback: ChallengeFeedbackData | null; currentConsequences: AppliedConsequence[]; bossId: string | null; result: ChallengeResult | null;
  startedAt: string; completedAt: string | null;
}
export interface ChallengeModuleState { challengeSchemaVersion: number; hydrated: boolean; run: ChallengeRun | null }
