import { ChallengeModuleState, ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG, CHALLENGE_RUN_STORAGE_KEY, CHALLENGE_SCHEMA_VERSION } from './config';
import { getChallengeBoss } from './bosses';
import { getChallengeEvent } from './events';
import { pauseChallengeTimer } from './timer';

export interface ChallengeStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type UnknownRecord = Record<string, unknown>;
const phases = new Set(['playing', 'feedback', 'resolving', 'transition', 'boss-intro', 'boss', 'boss-feedback', 'boss-resolving', 'time-expired', 'results']);
const record = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const bounded = (value: unknown, minimum: number, maximum: number) => finite(value) && value >= minimum && value <= maximum;

function validEffects(value: unknown) {
  if (!record(value)) return false;
  for (const key of ['balanceDelta', 'goalDelta', 'xp', 'commitmentDelta']) {
    if (value[key] !== undefined && !finite(value[key])) return false;
  }
  if (value.tags !== undefined && !stringArray(value.tags)) return false;
  if (value.metrics !== undefined) {
    if (!record(value.metrics)) return false;
    if (value.metrics.planning !== undefined && !finite(value.metrics.planning)) return false;
    if (value.metrics.commitments !== undefined && !finite(value.metrics.commitments)) return false;
  }
  return true;
}

function validDecision(value: unknown) {
  return record(value)
    && Number.isInteger(value.day) && Number(value.day) >= 1 && Number(value.day) <= CHALLENGE_CONFIG.totalDays
    && typeof value.eventId === 'string' && Boolean(getChallengeEvent(value.eventId))
    && typeof value.choiceId === 'string' && typeof value.choiceLabel === 'string'
    && finite(value.balanceDelta) && finite(value.goalDelta) && finite(value.xp)
    && stringArray(value.tags);
}

function validScheduledEffect(value: unknown) {
  return record(value)
    && typeof value.id === 'string' && typeof value.sourceEventId === 'string' && Boolean(getChallengeEvent(value.sourceEventId))
    && typeof value.sourceChoiceId === 'string' && Number.isInteger(value.dueDay) && Number(value.dueDay) > 1
    && typeof value.title === 'string' && typeof value.description === 'string'
    && typeof value.applied === 'boolean' && validEffects(value.effects);
}

function validConsequence(value: unknown) {
  return record(value) && typeof value.id === 'string' && typeof value.title === 'string' && typeof value.description === 'string'
    && finite(value.balanceDelta) && finite(value.goalDelta) && finite(value.xp);
}

function validFeedback(value: unknown) {
  return record(value) && typeof value.title === 'string' && typeof value.description === 'string'
    && finite(value.balanceDelta) && finite(value.goalDelta) && finite(value.xp)
    && finite(value.balanceAfter) && finite(value.goalAfter) && finite(value.commitmentsAfter)
    && typeof value.commitmentCreated === 'boolean' && typeof value.goalReached === 'boolean';
}

function validResult(value: unknown) {
  return record(value) && bounded(value.score, 0, 100) && ['C', 'B', 'A', 'S'].includes(String(value.rank))
    && typeof value.rankLabel === 'string' && /^NV-[A-Z0-9]{4}$/.test(String(value.nivvoId))
    && bounded(value.decisionTimeUsed, 0, CHALLENGE_CONFIG.decisionTimeLimitMs) && typeof value.timedOut === 'boolean'
    && record(value.breakdown) && Object.values(value.breakdown).every(item => bounded(item, 0, 100));
}

function browserStorage(): ChallengeStorageLike | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export function isValidChallengeRun(value: unknown): value is ChallengeRun {
  if (!record(value) || typeof value.id !== 'string' || !finite(value.seed) || typeof value.nickname !== 'string') return false;
  if (!value.nickname.trim() || Array.from(value.nickname).length > CHALLENGE_CONFIG.nicknameMaxLength || !phases.has(String(value.phase))) return false;
  const phase = String(value.phase);
  if (!Number.isInteger(value.day) || Number(value.day) < 1 || Number(value.day) > CHALLENGE_CONFIG.totalDays) return false;
  if (!finite(value.balance) || value.balance < 0 || !finite(value.goalAmount) || value.goalAmount < 0 || value.goalAmount > CHALLENGE_CONFIG.goalTarget) return false;
  if (!finite(value.xp) || value.xp < 0 || !finite(value.commitments) || value.commitments < 0) return false;
  if (!Array.isArray(value.eventIds) || value.eventIds.length !== CHALLENGE_CONFIG.totalDays || new Set(value.eventIds).size !== value.eventIds.length || value.eventIds.some(id => typeof id !== 'string' || !getChallengeEvent(id))) return false;
  if (!Array.isArray(value.decisions) || value.decisions.length > CHALLENGE_CONFIG.totalDays || !value.decisions.every(validDecision)) return false;
  if (new Set(value.decisions.map(decision => record(decision) ? decision.day : null)).size !== value.decisions.length) return false;
  if (!Array.isArray(value.scheduledEffects) || !value.scheduledEffects.every(validScheduledEffect) || !stringArray(value.appliedEffectIds) || !stringArray(value.tags)) return false;
  if (!Array.isArray(value.currentConsequences) || !value.currentConsequences.every(validConsequence)) return false;
  if (!record(value.metrics) || !bounded(value.metrics.planning, 0, 100) || !bounded(value.metrics.commitments, 0, 100)) return false;
  if (!record(value.decisionTimer) || !finite(value.decisionTimer.remainingMs) || value.decisionTimer.remainingMs < 0 || value.decisionTimer.remainingMs > CHALLENGE_CONFIG.decisionTimeLimitMs) return false;
  if (value.decisionTimer.activeSinceMs !== null && (!finite(value.decisionTimer.activeSinceMs) || !['playing', 'boss'].includes(phase))) return false;
  if (typeof value.pendingChoiceId !== 'string' && value.pendingChoiceId !== null) return false;
  if (['resolving', 'boss-resolving'].includes(phase) !== Boolean(value.pendingChoiceId)) return false;
  const feedbackPhase = phase === 'feedback' || phase === 'boss-feedback';
  if (feedbackPhase !== validFeedback(value.currentFeedback)) return false;
  if (typeof value.timedOut !== 'boolean' || !timestamp(value.startedAt) || (value.completedAt !== null && !timestamp(value.completedAt))) return false;
  if (value.bossId !== null && (typeof value.bossId !== 'string' || !getChallengeBoss(value.bossId))) return false;
  if (['boss-intro', 'boss', 'boss-resolving', 'boss-feedback'].includes(phase) && value.bossId === null) return false;
  if (value.result !== null) {
    if (!validResult(value.result) || value.completedAt === null || !['boss-feedback', 'time-expired', 'results'].includes(phase)) return false;
  } else if (['boss-feedback', 'time-expired', 'results'].includes(phase)) {
    return false;
  }
  if (value.timedOut !== (phase === 'time-expired' || (phase === 'results' && record(value.result) && value.result.timedOut === true))) return false;
  return true;
}

export function loadChallengeState(storage: ChallengeStorageLike | null = browserStorage(), nowMs = Date.now()): ChallengeModuleState {
  const empty = { challengeSchemaVersion: CHALLENGE_SCHEMA_VERSION, hydrated: true, run: null };
  if (!storage) return empty;
  try {
    const raw = storage.getItem(CHALLENGE_RUN_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!record(parsed) || parsed.challengeSchemaVersion !== CHALLENGE_SCHEMA_VERSION || !isValidChallengeRun(parsed.run)) throw new Error('invalid');
    return { ...empty, run: pauseChallengeTimer(parsed.run, nowMs) };
  } catch {
    try { storage.removeItem(CHALLENGE_RUN_STORAGE_KEY); } catch { /* sem armazenamento disponível */ }
    return empty;
  }
}

export function persistChallengeState(state: ChallengeModuleState, storage: ChallengeStorageLike | null = browserStorage()): boolean {
  if (!storage || !state.hydrated) return false;
  try {
    if (!state.run) storage.removeItem(CHALLENGE_RUN_STORAGE_KEY);
    else {
      if (!isValidChallengeRun(state.run)) return false;
      storage.setItem(CHALLENGE_RUN_STORAGE_KEY, JSON.stringify({ challengeSchemaVersion: CHALLENGE_SCHEMA_VERSION, run: state.run }));
    }
    return true;
  } catch { return false; }
}
