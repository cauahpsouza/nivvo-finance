import { AppState, Expense, Goal, XPEvent } from '../types';
import { getInitialAchievementStates } from '../lib/achievements';

export const CURRENT_SCHEMA_VERSION = 3;

function generateDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
}

export function getInitialState(): AppState {
  const expenses: Expense[] = [
    { id: 'exp-1', description: 'Internet', amount: 287.2, category: 'Contas', date: generateDate(8) },
    { id: 'exp-2', description: 'Mercado', amount: 320, category: 'Mercado', date: generateDate(7) },
    { id: 'exp-3', description: 'Delivery japonês', amount: 73, category: 'Delivery', date: generateDate(6) },
    { id: 'exp-4', description: 'Academia', amount: 99.9, category: 'Saúde', date: generateDate(5) },
    { id: 'exp-5', description: 'Steam', amount: 79.9, category: 'Lazer', date: generateDate(4) },
    { id: 'exp-6', description: 'Delivery de lanche', amount: 64, category: 'Delivery', date: generateDate(3) },
    { id: 'exp-7', description: 'Uber', amount: 28, category: 'Transporte', date: generateDate(2) },
    { id: 'exp-8', description: 'Almoço', amount: 42, category: 'Alimentação', date: generateDate(1) },
    { id: 'exp-9', description: 'Delivery de pizza', amount: 56, category: 'Delivery', date: generateDate(0) },
  ];

  const goal: Goal = {
    id: 'goal-pc',
    name: 'Comprar um PC',
    currentAmount: 2000,
    targetAmount: 3000,
    category: 'Tecnologia',
    icon: 'monitor',
    deadline: '2026-12-31',
    createdAt: generateDate(30),
    status: 'active',
  };

  const xpHistory: XPEvent[] = [
    { id: 'xp-init', amount: 760, reason: 'Progresso preparado para a demonstração', date: generateDate(10), key: 'welcome' },
  ];

  const initiallyUnlocked = [
    'org-01',
    'org-06',
    'goal-01',
    'goal-02',
    'goal-03',
    'streak-01',
    'streak-02',
    'explore-01',
    'explore-02',
  ];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userName: 'Gabriel Silva',
    expenses,
    goals: [goal],
    featuredGoalId: goal.id,
    goalContributions: [],
    xp: 760,
    xpHistory,
    activeMissionId: null,
    activeMissionStartedAt: null,
    activeMissionExpiresAt: null,
    availableMissionIds: ['rule-delivery'],
    completedMissionIds: [],
    failedMissionIds: [],
    achievements: getInitialAchievementStates(initiallyUnlocked, generateDate(10)),
    initialIncome: 5500,
    grantedRewardIds: ['welcome', 'first_goal', ...initiallyUnlocked.map(id => `achievement:${id}`)],
    streak: 7,
    lastActivityDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    equippedBadgeIds: ['org-01', 'goal-01'],
    equippedFrameId: 'frame-01',
    settings: { soundsEnabled: false },
  };
}

export const resetDemoData = getInitialState;
