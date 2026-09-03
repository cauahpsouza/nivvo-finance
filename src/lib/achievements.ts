import { Achievement, AchievementCategory, AchievementProgress, AchievementState, AppState, Rarity } from '../types';
import { awardXP, getLevelInfo, XP_REWARDS } from './gamification';
import { calculateGoalProgress } from './goals';

export const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string; accent: string }> = {
  COMUM: { bg: '#E8EDEB', border: '#B5C4BD', text: '#5A6B63', accent: '#8A9E94' },
  RARO: { bg: '#E0EFF5', border: '#6BA3BE', text: '#2A6F8E', accent: '#3D8BAF' },
  ÉPICO: { bg: '#EAF5E0', border: '#7DBA45', text: '#3D7A10', accent: '#A3E635' },
  LENDÁRIO: { bg: '#E8F5EE', border: '#1A6B42', text: '#0B3D24', accent: '#D4A017' },
};

interface AchievementConfig {
  id: string;
  order: number;
  title: string;
  description: string;
  conditionDescription: string;
  category: AchievementCategory;
  rarity: Rarity;
  rewardXP: number;
  secret?: boolean;
  getProgress: (state: AppState) => AchievementProgress;
}

const progress = (current: number, target: number, unit: string): AchievementProgress => ({
  current: Math.max(0, current),
  target,
  percentage: target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 100,
  label: `${Math.min(Math.max(0, current), target)} / ${target} ${unit}`,
});

const expenseCount = (state: AppState) => state.expenses.length;
const usedCategories = (state: AppState) => new Set(state.expenses.map(expense => expense.category)).size;
const completedGoals = (state: AppState) => state.goals.filter(goal => goal.status === 'completed').length;
const maxGoalProgress = (state: AppState) => Math.max(0, ...state.goals.map(goal => calculateGoalProgress(goal).percentage));
const totalContributed = (state: AppState) => state.goalContributions.reduce((total, item) => total + item.amount, 0);

const makeCountAchievement = (
  id: string,
  order: number,
  title: string,
  description: string,
  category: AchievementCategory,
  rarity: Rarity,
  target: number,
  unit: string,
  getter: (state: AppState) => number,
): AchievementConfig => ({
  id,
  order,
  title,
  description,
  conditionDescription: `${description} (${target} ${unit}).`,
  category,
  rarity,
  rewardXP: XP_REWARDS.achievement_unlocked,
  getProgress: state => progress(getter(state), target, unit),
});

export const ACHIEVEMENTS_CONFIG: AchievementConfig[] = [
  makeCountAchievement('org-01', 1, 'Primeiro registro', 'Registre seu primeiro gasto', 'Organização', 'COMUM', 1, 'registro', expenseCount),
  makeCountAchievement('org-02', 2, 'Organizador I', 'Registre gastos com consistência', 'Organização', 'COMUM', 10, 'registros', expenseCount),
  makeCountAchievement('org-03', 3, 'Organizador II', 'Amplie seu histórico financeiro', 'Organização', 'RARO', 25, 'registros', expenseCount),
  makeCountAchievement('org-04', 4, 'Organizador III', 'Mantenha um histórico detalhado', 'Organização', 'ÉPICO', 50, 'registros', expenseCount),
  makeCountAchievement('org-05', 5, 'Arquivo completo', 'Construa um histórico de longo prazo', 'Organização', 'LENDÁRIO', 100, 'registros', expenseCount),
  makeCountAchievement('org-06', 6, 'Radar financeiro', 'Use diferentes categorias de gastos', 'Organização', 'RARO', 7, 'categorias', usedCategories),

  makeCountAchievement('goal-01', 7, 'Primeira meta', 'Crie sua primeira meta', 'Metas', 'COMUM', 1, 'meta', state => state.goals.length),
  makeCountAchievement('goal-02', 8, 'Primeiro marco', 'Alcance 25% de uma meta', 'Metas', 'COMUM', 25, '%', maxGoalProgress),
  makeCountAchievement('goal-03', 9, 'Meio caminho', 'Alcance 50% de uma meta', 'Metas', 'RARO', 50, '%', maxGoalProgress),
  makeCountAchievement('goal-04', 10, 'Reta final', 'Alcance 75% de uma meta', 'Metas', 'ÉPICO', 75, '%', maxGoalProgress),
  makeCountAchievement('goal-05', 11, 'Objetivo alcançado', 'Complete uma meta', 'Metas', 'LENDÁRIO', 1, 'meta', completedGoals),
  makeCountAchievement('goal-06', 12, 'Caçador de objetivos', 'Complete diferentes metas', 'Metas', 'LENDÁRIO', 3, 'metas', completedGoals),

  makeCountAchievement('streak-01', 13, 'Começando o ritmo', 'Acompanhe suas finanças por dias consecutivos', 'Consistência', 'COMUM', 3, 'dias', state => state.streak),
  makeCountAchievement('streak-02', 14, 'Semana organizada', 'Mantenha uma semana de acompanhamento', 'Consistência', 'COMUM', 7, 'dias', state => state.streak),
  makeCountAchievement('streak-03', 15, 'Duas semanas', 'Mantenha duas semanas de acompanhamento', 'Consistência', 'RARO', 14, 'dias', state => state.streak),
  makeCountAchievement('streak-04', 16, 'Mês organizado', 'Mantenha um mês de acompanhamento', 'Consistência', 'ÉPICO', 30, 'dias', state => state.streak),
  makeCountAchievement('streak-05', 17, 'Disciplina', 'Mantenha dois meses de acompanhamento', 'Consistência', 'ÉPICO', 60, 'dias', state => state.streak),
  makeCountAchievement('streak-06', 18, 'Constância absoluta', 'Alcance uma sequência histórica', 'Consistência', 'LENDÁRIO', 100, 'dias', state => state.streak),

  makeCountAchievement('eco-01', 19, 'Primeira missão', 'Complete sua primeira missão', 'Economia', 'COMUM', 1, 'missão', state => state.completedMissionIds.length),
  makeCountAchievement('eco-02', 20, 'Em movimento', 'Complete uma série de missões', 'Economia', 'RARO', 5, 'missões', state => state.completedMissionIds.length),
  makeCountAchievement('eco-03', 21, 'Especialista em desafios', 'Domine o sistema de missões', 'Economia', 'LENDÁRIO', 10, 'missões', state => state.completedMissionIds.length),
  makeCountAchievement('eco-04', 22, 'Primeira reserva', 'Direcione dinheiro às suas metas', 'Economia', 'COMUM', 100, 'reais', totalContributed),
  makeCountAchievement('eco-05', 23, 'Reserva crescente', 'Aumente o total direcionado às metas', 'Economia', 'RARO', 500, 'reais', totalContributed),
  makeCountAchievement('eco-06', 24, 'Reserva sólida', 'Construa uma reserva relevante', 'Economia', 'ÉPICO', 1000, 'reais', totalContributed),

  makeCountAchievement('explore-01', 25, 'Explorador', 'Organize gastos em categorias diferentes', 'Exploração', 'COMUM', 3, 'categorias', usedCategories),
  makeCountAchievement('explore-02', 26, 'Visão ampla', 'Amplie o mapa dos seus gastos', 'Exploração', 'RARO', 5, 'categorias', usedCategories),
  makeCountAchievement('explore-03', 27, 'Estrategista', 'Alcance o nível Estrategista', 'Exploração', 'ÉPICO', 5, 'níveis', state => getLevelInfo(state.xp).number),
  makeCountAchievement('explore-04', 28, 'Especialista', 'Alcance o nível Especialista', 'Exploração', 'ÉPICO', 6, 'níveis', state => getLevelInfo(state.xp).number),
  makeCountAchievement('explore-05', 29, 'Mestre', 'Alcance o nível máximo', 'Exploração', 'LENDÁRIO', 7, 'níveis', state => getLevelInfo(state.xp).number),
  makeCountAchievement('explore-06', 30, 'Colecionador', 'Conquiste uma coleção extensa de emblemas', 'Exploração', 'LENDÁRIO', 20, 'emblemas', state => state.achievements.filter(item => item.status === 'unlocked').length),
];

export function getAchievementCollection(state: AppState): Achievement[] {
  return ACHIEVEMENTS_CONFIG.map(config => {
    const saved = state.achievements.find(item => item.id === config.id);
    return {
      id: config.id,
      order: config.order,
      title: config.secret && saved?.status !== 'unlocked' ? '???' : config.title,
      description: config.secret && saved?.status !== 'unlocked' ? 'Conquista secreta.' : config.description,
      conditionDescription: config.conditionDescription,
      category: config.category,
      rarity: config.rarity,
      rewardXP: config.rewardXP,
      secret: config.secret,
      status: saved?.status ?? 'locked',
      unlockedAt: saved?.unlockedAt,
      progress: config.getProgress(state),
    };
  });
}

export function checkAchievements(state: AppState): { state: AppState; unlocked: Achievement[] } {
  let currentState = { ...state, achievements: [...state.achievements] };
  const newlyUnlocked: Achievement[] = [];

  for (const config of ACHIEVEMENTS_CONFIG) {
    const savedIndex = currentState.achievements.findIndex(item => item.id === config.id);
    const saved = savedIndex >= 0 ? currentState.achievements[savedIndex] : { id: config.id, status: 'locked' as const };
    if (saved.status === 'unlocked') continue;

    const achievementProgress = config.getProgress(currentState);
    if (achievementProgress.current < achievementProgress.target) continue;

    const unlockedState: AchievementState = { id: config.id, status: 'unlocked', unlockedAt: new Date().toISOString() };
    if (savedIndex >= 0) currentState.achievements[savedIndex] = unlockedState;
    else currentState.achievements.push(unlockedState);

    const reward = awardXP(
      currentState,
      `achievement:${config.id}`,
      config.rewardXP,
      `Conquista: ${config.title}`,
    );
    currentState = reward.state;

    newlyUnlocked.push({
      id: config.id,
      order: config.order,
      title: config.title,
      description: config.description,
      conditionDescription: config.conditionDescription,
      category: config.category,
      rarity: config.rarity,
      rewardXP: config.rewardXP,
      status: 'unlocked',
      unlockedAt: unlockedState.unlockedAt,
      progress: achievementProgress,
    });
  }

  return { state: currentState, unlocked: newlyUnlocked };
}

export function getInitialAchievementStates(unlockedIds: string[] = [], unlockedAt = new Date().toISOString()): AchievementState[] {
  return ACHIEVEMENTS_CONFIG.map(config => ({
    id: config.id,
    status: unlockedIds.includes(config.id) ? 'unlocked' : 'locked',
    unlockedAt: unlockedIds.includes(config.id) ? unlockedAt : undefined,
  }));
}
