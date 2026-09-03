import { ACHIEVEMENTS_CONFIG, getInitialAchievementStates } from './achievements';
import { CURRENT_SCHEMA_VERSION, getInitialState } from '../data/demoData';
import { AchievementState, AppState, Goal } from '../types';

export const STORAGE_KEY = 'nivvo:demo:v3';
export const LEGACY_STORAGE_KEY = 'nivvo:demo:v2';

const legacyAchievementMap: Record<string, string> = {
  'ach-1': 'org-01',
  'ach-2': 'goal-01',
  'ach-3': 'org-02',
  'ach-4': 'eco-01',
  'ach-5': 'goal-05',
};

function normalizeAchievementStates(items: AchievementState[] | undefined): AchievementState[] {
  return ACHIEVEMENTS_CONFIG.map(config => {
    const existing = items?.find(item => item.id === config.id);
    return existing ?? { id: config.id, status: 'locked' };
  });
}

export function migrateStoredState(raw: unknown): AppState {
  const initial = getInitialState();
  if (!raw || typeof raw !== 'object') return initial;

  const candidate = raw as Partial<AppState> & {
    goal?: Partial<Goal>;
    achievements?: Array<AchievementState & { title?: string }>;
  };

  if (candidate.schemaVersion === CURRENT_SCHEMA_VERSION && Array.isArray(candidate.goals)) {
    const merged: AppState = {
      ...initial,
      ...candidate,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      expenses: Array.isArray(candidate.expenses) ? candidate.expenses : initial.expenses,
      goals: candidate.goals,
      goalContributions: Array.isArray(candidate.goalContributions) ? candidate.goalContributions : [],
      xpHistory: Array.isArray(candidate.xpHistory) ? candidate.xpHistory : initial.xpHistory,
      achievements: normalizeAchievementStates(candidate.achievements),
      availableMissionIds: Array.isArray(candidate.availableMissionIds) ? candidate.availableMissionIds : [],
      completedMissionIds: Array.isArray(candidate.completedMissionIds) ? candidate.completedMissionIds : [],
      failedMissionIds: Array.isArray(candidate.failedMissionIds) ? candidate.failedMissionIds : [],
      grantedRewardIds: Array.from(new Set([
        ...(Array.isArray(candidate.grantedRewardIds) ? candidate.grantedRewardIds : []),
        ...(candidate.goals.length > 0 ? ['first_goal'] : []),
      ])),
      equippedBadgeIds: Array.isArray(candidate.equippedBadgeIds) ? candidate.equippedBadgeIds.slice(0, 3) : [],
      settings: { ...initial.settings, ...candidate.settings },
    };
    return merged;
  }

  const legacyGoal: Goal = {
    id: 'goal-migrated',
    name: candidate.goal?.name ?? 'Comprar um PC',
    currentAmount: Number(candidate.goal?.currentAmount ?? 0),
    targetAmount: Math.max(1, Number(candidate.goal?.targetAmount ?? 3000)),
    category: 'Tecnologia',
    icon: 'monitor',
    deadline: candidate.goal?.deadline,
    createdAt: new Date().toISOString(),
    status: Number(candidate.goal?.currentAmount ?? 0) >= Number(candidate.goal?.targetAmount ?? 3000) ? 'completed' : 'active',
  };

  const migratedAchievements: AchievementState[] = getInitialAchievementStates();
  for (const oldAchievement of candidate.achievements ?? []) {
    const newId = legacyAchievementMap[oldAchievement.id] ?? oldAchievement.id;
    const target = migratedAchievements.find(item => item.id === newId);
    if (target && oldAchievement.status === 'unlocked') {
      target.status = 'unlocked';
      target.unlockedAt = oldAchievement.unlockedAt;
    }
  }

  const migratedRewardIds = (candidate.grantedRewardIds ?? []).map(key => {
    if (!key.startsWith('achievement:ach-')) return key;
    const oldId = key.replace('achievement:', '');
    return `achievement:${legacyAchievementMap[oldId] ?? oldId}`;
  });

  return {
    ...initial,
    expenses: Array.isArray(candidate.expenses) ? candidate.expenses : initial.expenses,
    goals: [legacyGoal],
    featuredGoalId: legacyGoal.id,
    xp: Number(candidate.xp ?? initial.xp),
    xpHistory: Array.isArray(candidate.xpHistory) ? candidate.xpHistory : initial.xpHistory,
    activeMissionId: candidate.activeMissionId ?? null,
    completedMissionIds: Array.isArray(candidate.completedMissionIds) ? candidate.completedMissionIds : [],
    achievements: migratedAchievements,
    initialIncome: Number(candidate.initialIncome ?? initial.initialIncome),
    grantedRewardIds: Array.from(new Set([...migratedRewardIds, 'first_goal'])),
    streak: Number(candidate.streak ?? initial.streak),
  };
}
