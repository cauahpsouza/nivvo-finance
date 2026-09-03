"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Achievement,
  AppState,
  Expense,
  GoalDraft,
  LevelUnlock,
  Mission,
  ToastEvent,
} from '../types';
import { getInitialState } from '../data/demoData';
import { awardXP, getLevelInfo, getUnlockedLevelRewards, XP_MESSAGES, XP_REWARDS } from '../lib/gamification';
import { checkAchievements } from '../lib/achievements';
import { evaluateMissions, getAvailableMissionIds, getMissionByRuleId } from '../lib/missions';
import { calculateAvailableBalance } from '../lib/finance';
import { getWeeklyChallenge, getWeeklyChallengeRewardKey, updateActivityStreak } from '../lib/analytics';
import { LEGACY_STORAGE_KEY, migrateStoredState, STORAGE_KEY } from '../lib/persistence';

type Feedback = ToastEvent;

interface LevelUpInfo {
  number: number;
  name: string;
  unlocks: LevelUnlock[];
}

interface MutationResult {
  state: AppState;
  feedback: Feedback[];
  levelUp: LevelUpInfo | null;
}

interface FinanceContextType {
  state: AppState | null;
  toasts: ToastEvent[];
  dismissToast: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  createGoal: (goal: GoalDraft) => void;
  updateGoal: (id: string, goal: GoalDraft) => void;
  archiveGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  setFeaturedGoal: (id: string) => void;
  addGoalFunds: (goalId: string, amount: number) => void;
  startMission: (id: string) => void;
  completeMission: () => void;
  claimWeeklyChallenge: () => void;
  restoreDemo: () => void;
  simulateExpense: () => void;
  simulateMissionCompletion: () => void;
  setXPNearNextLevel: () => void;
  toggleEquippedBadge: (id: string) => void;
  setEquippedFrame: (id: string | null) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  levelUpInfo: LevelUpInfo | null;
  dismissLevelUp: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

function refreshDerivedState(state: AppState): AppState {
  let next = state;
  if (next.activeMissionId && next.activeMissionExpiresAt && new Date(next.activeMissionExpiresAt).getTime() < Date.now()) {
    next = {
      ...next,
      failedMissionIds: [...next.failedMissionIds, `${next.activeMissionId}:${next.activeMissionStartedAt ?? 'expired'}`],
      activeMissionId: null,
      activeMissionStartedAt: null,
      activeMissionExpiresAt: null,
    };
  }
  return { ...next, availableMissionIds: getAvailableMissionIds(next) };
}

function finalizeMutation(before: AppState, mutated: AppState, feedback: Feedback[] = []): MutationResult {
  const previousLevel = getLevelInfo(before.xp);
  const achievementResult = checkAchievements(mutated);
  const events = [...feedback];

  for (const achievement of achievementResult.unlocked) {
    events.push({
      id: `achievement-unlocked:${achievement.id}`,
      variant: 'achievement',
      title: 'Conquista desbloqueada',
      description: `${achievement.title} +${achievement.rewardXP} XP`,
    });
  }

  const finalState = refreshDerivedState(achievementResult.state);
  const currentLevel = getLevelInfo(finalState.xp);
  const levelUp = currentLevel.number > previousLevel.number
    ? { number: currentLevel.number, name: currentLevel.name, unlocks: currentLevel.unlocks }
    : null;

  return { state: finalState, feedback: events, levelUp };
}

function stateOnly(state: AppState, feedback: Feedback[] = []): MutationResult {
  return { state, feedback, levelUp: null };
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [toasts, setToasts] = useState<ToastEvent[]>([]);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  const stateRef = useRef<AppState | null>(null);
  const toastTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeToastIds = useRef(new Set<string>());
  const persistenceBlockedRef = useRef(false);

  const pushToast = useCallback((toast: Feedback) => {
    if (activeToastIds.current.has(toast.id)) return;
    activeToastIds.current.add(toast.id);
    setToasts(previous => [...previous, toast]);
    const timeout = setTimeout(() => {
      setToasts(previous => previous.filter(item => item.id !== toast.id));
      toastTimeouts.current.delete(toast.id);
      activeToastIds.current.delete(toast.id);
    }, 4000);
    toastTimeouts.current.set(toast.id, timeout);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(previous => previous.filter(toast => toast.id !== id));
    const timeout = toastTimeouts.current.get(id);
    if (timeout) clearTimeout(timeout);
    toastTimeouts.current.delete(id);
    activeToastIds.current.delete(id);
  }, []);

  const commitMutation = useCallback((mutate: (previous: AppState) => MutationResult | null) => {
    const previous = stateRef.current;
    if (!previous) return false;

    const result = mutate(previous);
    if (!result) return false;

    const changed = result.state !== previous;
    if (changed) {
      stateRef.current = result.state;
      setState(result.state);
    }
    result.feedback.forEach(pushToast);
    if (result.levelUp) setLevelUpInfo(result.levelUp);
    return changed || result.feedback.length > 0 || result.levelUp !== null;
  }, [pushToast]);

  useEffect(() => () => {
    toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
    toastTimeouts.current.clear();
    activeToastIds.current.clear();
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
        const restored = refreshDerivedState(stored ? migrateStoredState(JSON.parse(stored)) : getInitialState());
        stateRef.current = restored;
        setState(restored);
      } catch {
        persistenceBlockedRef.current = true;
        const fallback = getInitialState();
        stateRef.current = fallback;
        setState(fallback);
        pushToast({
          id: 'finance-storage-load-error',
          variant: 'error',
          title: 'Dados locais protegidos',
          description: 'Não foi possível ler os dados salvos. A demonstração foi aberta sem sobrescrever o conteúdo anterior.',
        });
      }
    });
  }, [pushToast]);

  useEffect(() => {
    if (!state || persistenceBlockedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      persistenceBlockedRef.current = true;
      queueMicrotask(() => pushToast({
        id: 'finance-storage-save-error',
        variant: 'error',
        title: 'Alterações sem persistência',
        description: 'O navegador não conseguiu salvar os dados. Libere espaço antes de fechar esta aba.',
      }));
    }
  }, [pushToast, state]);

  const addExpense = useCallback((draft: Omit<Expense, 'id'>) => {
    commitMutation(previous => {
      const expense: Expense = { ...draft, id: crypto.randomUUID() };
      const streak = updateActivityStreak(previous);
      const mutated = { ...previous, ...streak, expenses: [expense, ...previous.expenses] };
      const reward = awardXP(mutated, `expense_logged:${expense.id}`, XP_REWARDS.expense_logged, 'Organização');
      const message = XP_MESSAGES.expense_logged;
      return finalizeMutation(previous, reward.state, [{
        id: `expense-logged:${expense.id}`,
        variant: 'xp',
        title: message.title,
        description: `${message.label} +${reward.xpGained} XP`,
      }]);
    });
  }, [commitMutation]);

  const updateExpense = useCallback((id: string, draft: Omit<Expense, 'id'>) => {
    const operationId = crypto.randomUUID();
    commitMutation(previous => {
      if (!previous.expenses.some(item => item.id === id)) return null;
      const next = { ...previous, expenses: previous.expenses.map(item => item.id === id ? { ...draft, id } : item) };
      return stateOnly(refreshDerivedState(next), [{ id: `expense-updated:${id}:${operationId}`, variant: 'success', title: 'Gasto atualizado', description: 'Alterações salvas.' }]);
    });
  }, [commitMutation]);

  const removeExpense = useCallback((id: string) => {
    const operationId = crypto.randomUUID();
    commitMutation(previous => {
      if (!previous.expenses.some(item => item.id === id)) return null;
      return stateOnly(
        refreshDerivedState({ ...previous, expenses: previous.expenses.filter(item => item.id !== id) }),
        [{ id: `expense-removed:${id}:${operationId}`, variant: 'success', title: 'Gasto removido', description: 'O registro foi excluído.' }],
      );
    });
  }, [commitMutation]);

  const createGoal = useCallback((draft: GoalDraft) => {
    commitMutation(previous => {
      const id = crypto.randomUUID();
      const goal = { ...draft, id, createdAt: new Date().toISOString(), status: draft.currentAmount >= draft.targetAmount ? 'completed' as const : 'active' as const };
      const streak = updateActivityStreak(previous);
      let mutated: AppState = {
        ...previous,
        ...streak,
        goals: [goal, ...previous.goals],
        featuredGoalId: previous.featuredGoalId ?? id,
      };
      const events: Feedback[] = [{ id: `goal-created:${id}`, variant: 'success', title: 'Meta criada', description: goal.name }];

      const reward = awardXP(mutated, 'first_goal', XP_REWARDS.first_goal, 'Primeira meta');
      mutated = reward.state;
      if (reward.xpGained > 0) events.push({ id: 'reward:first_goal', variant: 'xp', title: 'Meta criada', description: `Primeiro passo +${reward.xpGained} XP` });
      return finalizeMutation(previous, mutated, events);
    });
  }, [commitMutation]);

  const updateGoal = useCallback((id: string, draft: GoalDraft) => {
    const operationId = crypto.randomUUID();
    commitMutation(previous => {
      if (!previous.goals.some(goal => goal.id === id)) return null;
      const goals = previous.goals.map(goal => goal.id === id
        ? { ...goal, ...draft, status: draft.currentAmount >= draft.targetAmount ? 'completed' as const : goal.status === 'archived' ? 'archived' as const : 'active' as const }
        : goal);
      return finalizeMutation(previous, { ...previous, goals }, [{ id: `goal-updated:${id}:${operationId}`, variant: 'success', title: 'Meta atualizada', description: 'Alterações salvas.' }]);
    });
  }, [commitMutation]);

  const archiveGoal = useCallback((id: string) => {
    commitMutation(previous => {
      const goal = previous.goals.find(item => item.id === id);
      if (!goal || goal.status === 'archived') return null;
      const goals = previous.goals.map(goal => goal.id === id ? { ...goal, status: 'archived' as const } : goal);
      const featuredGoalId = previous.featuredGoalId === id ? goals.find(goal => goal.status === 'active')?.id ?? null : previous.featuredGoalId;
      return stateOnly(refreshDerivedState({ ...previous, goals, featuredGoalId }));
    });
  }, [commitMutation]);

  const deleteGoal = useCallback((id: string) => {
    commitMutation(previous => {
      if (!previous.goals.some(goal => goal.id === id)) return null;
      const goals = previous.goals.filter(goal => goal.id !== id);
      const featuredGoalId = previous.featuredGoalId === id ? goals.find(goal => goal.status === 'active')?.id ?? null : previous.featuredGoalId;
      return stateOnly(refreshDerivedState({ ...previous, goals, featuredGoalId }));
    });
  }, [commitMutation]);

  const setFeaturedGoal = useCallback((id: string) => {
    commitMutation(previous => previous.goals.some(goal => goal.id === id && goal.status !== 'archived') && previous.featuredGoalId !== id
      ? stateOnly({ ...previous, featuredGoalId: id })
      : null);
  }, [commitMutation]);

  const addGoalFunds = useCallback((goalId: string, requestedAmount: number) => {
    commitMutation(previous => {
      const goal = previous.goals.find(item => item.id === goalId);
      if (!goal || goal.status !== 'active') return null;

      const available = Math.max(0, calculateAvailableBalance(previous));
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const amount = Math.min(Math.max(0, requestedAmount), available, remaining);
      if (amount <= 0) return null;

      const contributionId = crypto.randomUUID();
      const newAmount = goal.currentAmount + amount;
      const completed = newAmount >= goal.targetAmount;
      const streak = updateActivityStreak(previous);
      let mutated: AppState = {
        ...previous,
        ...streak,
        goals: previous.goals.map(item => item.id === goalId
          ? { ...item, currentAmount: newAmount, status: completed ? 'completed' : 'active' }
          : item),
        goalContributions: [{ id: contributionId, goalId, amount, date: new Date().toISOString() }, ...previous.goalContributions],
      };
      const events: Feedback[] = [];
      const fundReward = awardXP(mutated, `goal_funded:${contributionId}`, XP_REWARDS.goal_funded, 'Disciplina');
      mutated = fundReward.state;
      events.push({ id: `goal-funded:${contributionId}`, variant: 'xp', title: 'Meta atualizada', description: `Disciplina +${fundReward.xpGained} XP` });

      if (completed) {
        const completionReward = awardXP(mutated, `goal_completed:${goal.id}`, XP_REWARDS.goal_completed, 'Meta concluída');
        mutated = completionReward.state;
        if (completionReward.xpGained > 0) {
          events.push({ id: `goal-completed:${goal.id}`, variant: 'success', title: 'META CONCLUÍDA', description: `${goal.name} +${completionReward.xpGained} XP` });
        }
      }
      return finalizeMutation(previous, mutated, events);
    });
  }, [commitMutation]);

  const startMission = useCallback((id: string) => {
    commitMutation(previous => {
      if (previous.activeMissionId) return null;
      const mission = getMissionByRuleId(id, previous, 'available');
      if (!mission) return null;
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + mission.durationHours * 60 * 60 * 1000);
      return stateOnly({
        ...previous,
        activeMissionId: id,
        activeMissionStartedAt: startedAt.toISOString(),
        activeMissionExpiresAt: expiresAt.toISOString(),
      }, [{ id: `mission-accepted:${id}:${startedAt.toISOString()}`, variant: 'info', title: 'Missão ativa', description: mission.title }]);
    });
  }, [commitMutation]);

  const completeMission = useCallback(() => {
    commitMutation(previous => {
      if (!previous.activeMissionId) return null;
      const mission = getMissionByRuleId(previous.activeMissionId, previous, 'active');
      if (!mission) return null;
      const completionId = `${mission.id}:${crypto.randomUUID()}`;
      let mutated: AppState = {
        ...previous,
        activeMissionId: null,
        activeMissionStartedAt: null,
        activeMissionExpiresAt: null,
        completedMissionIds: [...previous.completedMissionIds, completionId],
      };
      const reward = awardXP(mutated, `mission_completed:${completionId}`, mission.rewardXP, 'Missão concluída');
      mutated = reward.state;
      return finalizeMutation(previous, mutated, [{ id: `mission-completed:${completionId}`, variant: 'xp', title: 'Missão concluída', description: `${mission.title} +${reward.xpGained} XP` }]);
    });
  }, [commitMutation]);

  const claimWeeklyChallenge = useCallback(() => {
    commitMutation(previous => {
      const challenge = getWeeklyChallenge(previous);
      const rewardKey = getWeeklyChallengeRewardKey(challenge.id);
      if (challenge.current >= challenge.limit || previous.grantedRewardIds.includes(rewardKey)) return null;
      const reward = awardXP(previous, rewardKey, challenge.rewardXP, `Desafio semanal: ${challenge.title}`);
      return finalizeMutation(previous, reward.state, [{ id: rewardKey, variant: 'xp', title: 'Desafio concluído', description: `${challenge.title} +${reward.xpGained} XP` }]);
    });
  }, [commitMutation]);

  const restoreDemo = useCallback(() => {
    const operationId = crypto.randomUUID();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      persistenceBlockedRef.current = false;
    } catch {
      pushToast({ id: `restore-demo-error:${operationId}`, variant: 'error', title: 'Não foi possível restaurar', description: 'O navegador bloqueou o armazenamento local.' });
      return;
    }
    const restored = getInitialState();
    stateRef.current = restored;
    setState(restored);
    toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
    toastTimeouts.current.clear();
    activeToastIds.current.clear();
    setToasts([]);
    setLevelUpInfo(null);
    pushToast({ id: `restore-demo:${operationId}`, variant: 'info', title: 'Demonstração restaurada', description: 'Os dados da feira foram recarregados.' });
  }, [pushToast]);

  const simulateExpense = useCallback(() => {
    addExpense({ description: 'Café da apresentação', amount: 18, category: 'Outros', date: new Date().toISOString() });
  }, [addExpense]);

  const simulateMissionCompletion = useCallback(() => {
    commitMutation(previous => {
      const missionId = previous.activeMissionId ?? previous.availableMissionIds[0] ?? getAvailableMissionIds(previous)[0];
      if (!missionId) {
        return stateOnly(previous, [{ id: `mission-unavailable:${crypto.randomUUID()}`, variant: 'info', title: 'Sem missão disponível', description: 'Restaure os dados da feira para repetir o fluxo.' }]);
      }
      const mission = getMissionByRuleId(missionId, previous, 'active');
      if (!mission) return null;
      const completionId = `${missionId}:${crypto.randomUUID()}`;
      let mutated: AppState = {
        ...previous,
        activeMissionId: null,
        activeMissionStartedAt: null,
        activeMissionExpiresAt: null,
        completedMissionIds: [...previous.completedMissionIds, completionId],
      };
      const reward = awardXP(mutated, `mission_completed:${completionId}`, mission.rewardXP, 'Missão concluída');
      mutated = reward.state;
      return finalizeMutation(previous, mutated, [{ id: `mission-completed:${completionId}`, variant: 'xp', title: 'Missão concluída', description: `${mission.title} +${reward.xpGained} XP` }]);
    });
  }, [commitMutation]);

  const setXPNearNextLevel = useCallback(() => {
    const operationId = crypto.randomUUID();
    commitMutation(previous => {
      const current = getLevelInfo(previous.xp);
      const targetXP = current.nextLevelMinXP ? Math.max(previous.xp, current.nextLevelMinXP - 20) : 1980;
      if (targetXP === previous.xp) return null;
      const amount = targetXP - previous.xp;
      return stateOnly({
        ...previous,
        xp: targetXP,
        xpHistory: [{ id: operationId, reason: 'Preparação do modo feira', amount, date: new Date().toISOString(), key: `demo:near-level:${operationId}` }, ...previous.xpHistory],
      }, [{ id: `xp-prepared:${operationId}`, variant: 'info', title: 'XP preparado', description: 'Faltam 20 XP para o próximo nível.' }]);
    });
  }, [commitMutation]);

  const toggleEquippedBadge = useCallback((id: string) => {
    commitMutation(previous => {
      const unlocked = previous.achievements.some(item => item.id === id && item.status === 'unlocked');
      if (!unlocked) return null;
      const equipped = previous.equippedBadgeIds.includes(id)
        ? previous.equippedBadgeIds.filter(item => item !== id)
        : [...previous.equippedBadgeIds, id].slice(-3);
      return stateOnly({ ...previous, equippedBadgeIds: equipped });
    });
  }, [commitMutation]);

  const setEquippedFrame = useCallback((id: string | null) => {
    commitMutation(previous => {
      const frames = getUnlockedLevelRewards(previous.xp).filter(item => item.kind === 'frame').map(item => item.id);
      return (id === null || frames.includes(id)) && previous.equippedFrameId !== id
        ? stateOnly({ ...previous, equippedFrameId: id })
        : null;
    });
  }, [commitMutation]);

  const setSoundsEnabled = useCallback((enabled: boolean) => {
    commitMutation(previous => previous.settings.soundsEnabled !== enabled
      ? stateOnly({ ...previous, settings: { ...previous.settings, soundsEnabled: enabled } })
      : null);
  }, [commitMutation]);

  return (
    <FinanceContext.Provider value={{
      state,
      toasts,
      dismissToast,
      addExpense,
      updateExpense,
      removeExpense,
      createGoal,
      updateGoal,
      archiveGoal,
      deleteGoal,
      setFeaturedGoal,
      addGoalFunds,
      startMission,
      completeMission,
      claimWeeklyChallenge,
      restoreDemo,
      simulateExpense,
      simulateMissionCompletion,
      setXPNearNextLevel,
      toggleEquippedBadge,
      setEquippedFrame,
      setSoundsEnabled,
      levelUpInfo,
      dismissLevelUp: () => setLevelUpInfo(null),
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
}

export function useActiveMission(): Mission | null {
  const { state } = useFinance();
  return state ? evaluateMissions(state) : null;
}

export function useAvailableMissions(): Mission[] {
  const { state } = useFinance();
  if (!state) return [];
  return state.availableMissionIds
    .map(id => getMissionByRuleId(id, state, state.activeMissionId === id ? 'active' : 'available'))
    .filter((mission): mission is Mission => mission !== null);
}

export type { Achievement };
