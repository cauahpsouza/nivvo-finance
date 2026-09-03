import {
  AppliedConsequence,
  ChallengeBossChoice,
  ChallengeChoice,
  ChallengeDecision,
  ChallengeEffects,
  ChallengeEvent,
  ChallengeRun,
  ScheduledEffect,
} from '../../types/challenge';
import { CHALLENGE_CONFIG } from './config';
import { CHALLENGE_EVENTS, getChallengeEvent } from './events';
import { getChallengeBoss, selectFinalBoss } from './bosses';
import { createChallengeResult } from './scoring';
import {
  createChallengeDecisionTimer,
  getChallengeTimerRemainingMs,
  pauseChallengeTimer,
} from './timer';

const clamp = (value: number, minimum: number, maximum: number) => Math.max(
  minimum,
  Math.min(maximum, Number.isFinite(value) ? value : minimum),
);

function randomFromSeed(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function isFoodEvent(event: ChallengeEvent) {
  return event.category === 'Alimentação'
    || event.category === 'Mercado'
    || event.choices.some(choice => choice.effects.tags?.includes('food'));
}

function pickEvent(events: ChallengeEvent[], random: () => number, used: Set<string>): ChallengeEvent {
  const available = events.filter(event => !used.has(event.id));
  const source = available.length ? available : CHALLENGE_EVENTS.filter(event => !used.has(event.id));
  const selected = source[Math.floor(random() * source.length)] ?? CHALLENGE_EVENTS[0];
  used.add(selected.id);
  return selected;
}

function shuffleEvents(events: ChallengeEvent[], random: () => number) {
  const result = [...events];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function selectChallengeEvents(seed: number): string[] {
  const random = randomFromSeed(seed);
  const used = new Set<string>();
  const consequenceEvents = CHALLENGE_EVENTS.filter(event => event.choices.some(choice => choice.scheduledEffects?.length));
  const necessaryEvents = CHALLENGE_EVENTS.filter(event => event.kind === 'necessary');
  const savingEvents = CHALLENGE_EVENTS.filter(
    event => event.kind === 'saving' && event.choices.some(choice => (choice.effects.goalDelta ?? 0) > 0),
  );
  const positiveEvents = CHALLENGE_EVENTS.filter(event => event.kind === 'positive');
  const flexibleEvents = CHALLENGE_EVENTS.filter(event => event.kind === 'flexible');

  const consequence = pickEvent(consequenceEvents, random, used);
  const selected = [
    pickEvent(flexibleEvents, random, used),
    consequence,
    pickEvent(necessaryEvents, random, used),
    pickEvent(savingEvents, random, used),
    pickEvent(positiveEvents, random, used),
  ];

  while (selected.length < CHALLENGE_CONFIG.totalDays) {
    const foodCount = selected.filter(isFoodEvent).length;
    const categories = new Set(selected.map(event => event.category));
    const available = CHALLENGE_EVENTS.filter(
      event => !used.has(event.id) && (foodCount < 2 || !isFoodEvent(event)),
    );
    const varied = available.filter(event => !categories.has(event.category));
    selected.push(pickEvent(varied.length ? varied : available, random, used));
  }

  const shuffled = shuffleEvents(selected, random);
  const consequenceIndex = shuffled.findIndex(event => event.id === consequence.id);
  if (consequenceIndex > 3) {
    const target = Math.floor(random() * 4);
    [shuffled[target], shuffled[consequenceIndex]] = [shuffled[consequenceIndex], shuffled[target]];
  }
  return shuffled.map(event => event.id);
}

export function truncateChallengeNickname(value: string): string {
  return Array.from(value).slice(0, CHALLENGE_CONFIG.nicknameMaxLength).join('');
}

export function sanitizeChallengeNickname(value: string): string {
  const sanitized = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return truncateChallengeNickname(sanitized);
}

export function isValidChallengeNickname(value: string): boolean {
  const sanitized = sanitizeChallengeNickname(value);
  return sanitized.length > 0 && Array.from(sanitized).length <= CHALLENGE_CONFIG.nicknameMaxLength;
}

export function createChallengeRun(input: { nickname: string; seed: number; runId: string; startedAt: string }): ChallengeRun {
  const nickname = sanitizeChallengeNickname(input.nickname);
  if (!isValidChallengeNickname(nickname)) throw new Error('Informe um nome ou apelido para iniciar.');
  return {
    id: input.runId,
    seed: input.seed,
    nickname,
    phase: 'playing',
    day: 1,
    balance: CHALLENGE_CONFIG.startingBalance,
    goalAmount: 0,
    xp: 0,
    eventIds: selectChallengeEvents(input.seed),
    decisions: [],
    scheduledEffects: [],
    appliedEffectIds: [],
    commitments: 0,
    metrics: { ...CHALLENGE_CONFIG.initialMetrics },
    tags: [],
    commitmentsResolved: 0,
    pendingChoiceId: null,
    decisionTimer: createChallengeDecisionTimer(),
    timedOut: false,
    currentFeedback: null,
    currentConsequences: [],
    bossId: null,
    result: null,
    startedAt: input.startedAt,
    completedAt: null,
  };
}

export function getCurrentChallengeEvent(run: ChallengeRun): ChallengeEvent | null {
  return getChallengeEvent(run.eventIds[run.day - 1] ?? '');
}

function resolveBossEffects(run: ChallengeRun, choice: ChallengeBossChoice): ChallengeEffects {
  if (choice.commitmentPaymentRatio === undefined) return choice.effects;
  const ratio = clamp(choice.commitmentPaymentRatio, 0, 1);
  const desiredPayment = ratio >= 1 ? run.commitments : Math.ceil(run.commitments * ratio);
  const payment = Math.min(
    run.balance,
    run.commitments,
    choice.maxCommitmentPayment ?? Number.POSITIVE_INFINITY,
    desiredPayment,
  );
  return { ...choice.effects, balanceDelta: -payment, commitmentDelta: -payment };
}

function calculateAppliedEffects(run: ChallengeRun, effects: ChallengeEffects, convertShortfallToCommitment: boolean) {
  const desiredGoalDelta = Number(effects.goalDelta ?? 0);
  let goalDelta = desiredGoalDelta >= 0
    ? Math.min(desiredGoalDelta, CHALLENGE_CONFIG.goalTarget - run.goalAmount)
    : -Math.min(Math.abs(desiredGoalDelta), run.goalAmount);
  goalDelta = Number.isFinite(goalDelta) ? goalDelta : 0;

  let balanceDelta = Number.isFinite(effects.balanceDelta) ? effects.balanceDelta ?? 0 : 0;
  if (desiredGoalDelta > goalDelta) {
    const overflow = desiredGoalDelta - goalDelta;
    balanceDelta = balanceDelta === -desiredGoalDelta ? -goalDelta : balanceDelta + overflow;
  }

  let shortfall = 0;
  if (run.balance + balanceDelta < 0) {
    shortfall = Math.abs(run.balance + balanceDelta);
    if (convertShortfallToCommitment) balanceDelta = -run.balance;
  }

  let commitmentDelta = (Number.isFinite(effects.commitmentDelta) ? effects.commitmentDelta ?? 0 : 0)
    + (convertShortfallToCommitment ? shortfall : 0);
  if (commitmentDelta < 0) commitmentDelta = -Math.min(run.commitments, Math.abs(commitmentDelta));

  const planningAdjustment = effects.metrics?.planning ?? 0;
  const commitmentAdjustment = (effects.metrics?.commitments ?? 0)
    - (convertShortfallToCommitment && shortfall > 0 ? 10 : 0);
  const resolvedCommitment = Boolean(effects.tags?.includes('commitment-resolved')) && shortfall === 0;

  return {
    balanceDelta,
    goalDelta,
    xp: Math.max(0, Number.isFinite(effects.xp) ? effects.xp ?? 0 : 0),
    commitmentDelta,
    tags: effects.tags ?? [],
    resolvedCommitment,
    metrics: {
      planning: clamp(run.metrics.planning + planningAdjustment, 0, 100),
      commitments: clamp(run.metrics.commitments + commitmentAdjustment, 0, 100),
    },
  };
}

function applyEffects(run: ChallengeRun, effects: ChallengeEffects, convertShortfallToCommitment = false): ChallengeRun {
  const applied = calculateAppliedEffects(run, effects, convertShortfallToCommitment);
  return {
    ...run,
    balance: Math.max(0, run.balance + applied.balanceDelta),
    goalAmount: clamp(run.goalAmount + applied.goalDelta, 0, CHALLENGE_CONFIG.goalTarget),
    xp: Math.max(0, run.xp + applied.xp),
    commitments: Math.max(0, run.commitments + applied.commitmentDelta),
    metrics: applied.metrics,
    commitmentsResolved: run.commitmentsResolved + (applied.resolvedCommitment ? 1 : 0),
    tags: [...run.tags, ...applied.tags],
  };
}

function choiceEffects(run: ChallengeRun, choice: ChallengeChoice | ChallengeBossChoice) {
  return 'commitmentPaymentRatio' in choice ? resolveBossEffects(run, choice) : choice.effects;
}

export function isChallengeChoiceAvailable(run: ChallengeRun, choice: ChallengeChoice | ChallengeBossChoice): boolean {
  const goalRequired = 'requiresGoalAmount' in choice ? choice.requiresGoalAmount ?? 0 : 0;
  if (goalRequired > run.goalAmount) return false;
  if (choice.allowShortfallAsCommitment) return true;
  const applied = calculateAppliedEffects(run, choiceEffects(run, choice), false);
  return run.balance + applied.balanceDelta >= 0;
}

function buildScheduledEffects(run: ChallengeRun, eventId: string, choice: ChallengeChoice): ScheduledEffect[] {
  return (choice.scheduledEffects ?? []).map(template => ({
    id: `${run.id}:${eventId}:${choice.id}:${template.id}`,
    sourceEventId: eventId,
    sourceChoiceId: choice.id,
    dueDay: run.day + template.delayDays,
    title: template.title,
    description: template.description,
    effects: template.effects,
    applied: false,
  }));
}

function commitEventChoice(run: ChallengeRun, choiceId: string): ChallengeRun {
  if ((run.phase !== 'playing' && run.phase !== 'resolving') || run.decisions.some(decision => decision.day === run.day)) return run;
  const event = getCurrentChallengeEvent(run);
  const choice = event?.choices.find(item => item.id === choiceId);
  if (!event || !choice || !isChallengeChoiceAvailable(run, choice)) return { ...run, phase: 'playing', pendingChoiceId: null };

  const before = run;
  let next = applyEffects(run, choice.effects, Boolean(choice.allowShortfallAsCommitment));
  const scheduledEffects = buildScheduledEffects(run, event.id, choice)
    .filter(effect => !run.scheduledEffects.some(existing => existing.id === effect.id));
  const decision: ChallengeDecision = {
    day: run.day,
    eventId: event.id,
    choiceId: choice.id,
    choiceLabel: choice.label,
    balanceDelta: next.balance - before.balance,
    goalDelta: next.goalAmount - before.goalAmount,
    xp: next.xp - before.xp,
    tags: choice.effects.tags ?? [],
  };

  next = {
    ...next,
    phase: 'feedback',
    pendingChoiceId: null,
    decisions: [...run.decisions, decision],
    scheduledEffects: [...run.scheduledEffects, ...scheduledEffects],
    currentConsequences: [],
    currentFeedback: {
      title: choice.label,
      description: choice.feedback,
      balanceDelta: decision.balanceDelta,
      goalDelta: decision.goalDelta,
      xp: decision.xp,
      commitmentCreated: scheduledEffects.length > 0 || next.commitments > before.commitments,
      goalReached: before.goalAmount < CHALLENGE_CONFIG.goalTarget && next.goalAmount >= CHALLENGE_CONFIG.goalTarget,
      balanceAfter: next.balance,
      goalAfter: next.goalAmount,
      commitmentsAfter: next.commitments,
    },
  };
  return next;
}

export function queueChallengeChoice(run: ChallengeRun, choiceId: string, nowMs: number, completedAt: string): ChallengeRun {
  if (run.phase !== 'playing') return run;
  const paused = pauseChallengeTimer(run, nowMs);
  if (getChallengeTimerRemainingMs(paused, nowMs) <= 0) return expireChallengeRun(paused, completedAt, nowMs);
  const event = getCurrentChallengeEvent(paused);
  const choice = event?.choices.find(item => item.id === choiceId);
  if (!choice || !isChallengeChoiceAvailable(paused, choice)) return paused;
  return { ...paused, phase: 'resolving', pendingChoiceId: choiceId };
}

export function resolveQueuedChallengeChoice(run: ChallengeRun): ChallengeRun {
  return run.phase === 'resolving' && run.pendingChoiceId ? commitEventChoice(run, run.pendingChoiceId) : run;
}

/** Direct helper kept for deterministic engine tests and simulations. */
export function applyChallengeChoice(run: ChallengeRun, choiceId: string): ChallengeRun {
  return commitEventChoice(run, choiceId);
}

export function applyScheduledEffects(run: ChallengeRun, day: number): ChallengeRun {
  const dueEffects = run.scheduledEffects.filter(
    effect => !effect.applied && effect.dueDay <= day && !run.appliedEffectIds.includes(effect.id),
  );
  if (!dueEffects.length) return { ...run, currentConsequences: [] };

  let next = run;
  const consequences: AppliedConsequence[] = [];
  for (const effect of dueEffects) {
    const before = next;
    next = applyEffects(next, effect.effects, true);
    consequences.push({
      id: effect.id,
      title: effect.title,
      description: effect.description,
      balanceDelta: next.balance - before.balance,
      goalDelta: next.goalAmount - before.goalAmount,
      xp: next.xp - before.xp,
    });
  }

  const appliedIds = dueEffects.map(effect => effect.id);
  return {
    ...next,
    scheduledEffects: next.scheduledEffects.map(effect => appliedIds.includes(effect.id) ? { ...effect, applied: true } : effect),
    appliedEffectIds: [...new Set([...next.appliedEffectIds, ...appliedIds])],
    currentConsequences: consequences,
  };
}

export function advanceChallengeDay(run: ChallengeRun): ChallengeRun {
  if (run.phase !== 'feedback') return run;
  if (run.day >= CHALLENGE_CONFIG.totalDays) {
    const settled = applyScheduledEffects(run, CHALLENGE_CONFIG.totalDays);
    const boss = selectFinalBoss(settled);
    return { ...settled, phase: 'boss-intro', bossId: boss.id, currentFeedback: null, pendingChoiceId: null };
  }
  const nextDay = run.day + 1;
  const withConsequences = applyScheduledEffects({ ...run, day: nextDay, currentFeedback: null }, nextDay);
  return { ...withConsequences, phase: 'transition', pendingChoiceId: null };
}

export function finishChallengeTransition(run: ChallengeRun): ChallengeRun {
  return run.phase === 'transition' ? { ...run, phase: 'playing' } : run;
}

export function finishBossIntro(run: ChallengeRun): ChallengeRun {
  return run.phase === 'boss-intro' ? { ...run, phase: 'boss', currentConsequences: [] } : run;
}

function commitBossChoice(run: ChallengeRun, choiceId: string, completedAt: string, nowMs: number): ChallengeRun {
  if ((run.phase !== 'boss' && run.phase !== 'boss-resolving') || run.result) return run;
  const boss = getChallengeBoss(run.bossId ?? '');
  const choice = boss?.choices.find(item => item.id === choiceId);
  if (!boss || !choice || !isChallengeChoiceAvailable(run, choice)) return { ...run, phase: 'boss', pendingChoiceId: null };

  const before = run;
  const effects = resolveBossEffects(run, choice);
  const changed = applyEffects(run, effects, Boolean(choice.allowShortfallAsCommitment));
  const completed: ChallengeRun = {
    ...changed,
    phase: 'boss-feedback',
    pendingChoiceId: null,
    completedAt,
    currentFeedback: {
      title: choice.label,
      description: choice.feedback,
      balanceDelta: changed.balance - before.balance,
      goalDelta: changed.goalAmount - before.goalAmount,
      xp: changed.xp - before.xp,
      commitmentCreated: changed.commitments > before.commitments,
      goalReached: before.goalAmount < CHALLENGE_CONFIG.goalTarget && changed.goalAmount >= CHALLENGE_CONFIG.goalTarget,
      balanceAfter: changed.balance,
      goalAfter: changed.goalAmount,
      commitmentsAfter: changed.commitments,
    },
  };
  return { ...completed, result: createChallengeResult(completed, nowMs) };
}

export function queueBossChoice(run: ChallengeRun, choiceId: string, nowMs: number, completedAt: string): ChallengeRun {
  if (run.phase !== 'boss') return run;
  const paused = pauseChallengeTimer(run, nowMs);
  if (getChallengeTimerRemainingMs(paused, nowMs) <= 0) return expireChallengeRun(paused, completedAt, nowMs);
  const boss = getChallengeBoss(paused.bossId ?? '');
  const choice = boss?.choices.find(item => item.id === choiceId);
  if (!choice || !isChallengeChoiceAvailable(paused, choice)) return paused;
  return { ...paused, phase: 'boss-resolving', pendingChoiceId: choiceId };
}

export function resolveQueuedBossChoice(run: ChallengeRun, completedAt: string, nowMs: number): ChallengeRun {
  return run.phase === 'boss-resolving' && run.pendingChoiceId
    ? commitBossChoice(run, run.pendingChoiceId, completedAt, nowMs)
    : run;
}

/** Direct helper kept for deterministic engine tests and simulations. */
export function applyBossChoice(run: ChallengeRun, choiceId: string, completedAt: string, nowMs = Date.parse(completedAt)): ChallengeRun {
  return commitBossChoice(run, choiceId, completedAt, Number.isFinite(nowMs) ? nowMs : 0);
}

export function expireChallengeRun(run: ChallengeRun, completedAt: string, nowMs: number): ChallengeRun {
  // Uma escolha aceita antes do zero tem precedência sobre o tick concorrente
  // do cronômetro. A fase de resolução finalizará a decisão exatamente uma vez.
  if (run.result || run.phase === 'resolving' || run.phase === 'boss-resolving') return run;
  const paused = pauseChallengeTimer(run, nowMs);
  const settled = applyScheduledEffects(paused, CHALLENGE_CONFIG.totalDays);
  const expired: ChallengeRun = {
    ...settled,
    phase: 'time-expired',
    pendingChoiceId: null,
    timedOut: true,
    decisionTimer: { remainingMs: 0, activeSinceMs: null },
    currentFeedback: null,
    completedAt,
  };
  return { ...expired, result: createChallengeResult(expired, nowMs) };
}

export function revealChallengeResults(run: ChallengeRun): ChallengeRun {
  return (run.phase === 'boss-feedback' || run.phase === 'time-expired') && run.result
    ? { ...run, phase: 'results', currentFeedback: null }
    : run;
}
