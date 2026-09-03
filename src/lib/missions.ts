import { AppState, Category, Mission } from '../types';
import { calculateCategoryTotals, getExpensesSince, getFeaturedGoal } from './finance';
import { calculateGoalProgress } from './goals';

interface MissionRule {
  id: string;
  priority: number;
  title: string;
  objective: string;
  rewardXP: number;
  target: number;
  durationHours: number;
  check: (state: AppState) => boolean;
  reason: (state: AppState) => string;
  blockedCategory?: Category;
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const MISSION_RULES: MissionRule[] = [
  {
    id: 'rule-delivery',
    priority: 1,
    title: 'Semana sem delivery',
    objective: 'Passe 7 dias sem novos gastos em Delivery.',
    rewardXP: 100,
    target: 7,
    durationHours: 7 * 24,
    blockedCategory: 'Delivery',
    check: state => getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.category === 'Delivery').length >= 3,
    reason: state => `${getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.category === 'Delivery').length} pedidos de delivery foram registrados nos últimos 7 dias.`,
  },
  {
    id: 'rule-goal-final',
    priority: 2,
    title: 'Reta final',
    objective: 'Adicione R$ 100,00 à meta em destaque.',
    rewardXP: 100,
    target: 100,
    durationHours: 7 * 24,
    check: state => {
      const goal = getFeaturedGoal(state);
      if (!goal) return false;
      const value = calculateGoalProgress(goal).percentage;
      return value >= 75 && value < 100;
    },
    reason: state => {
      const goal = getFeaturedGoal(state);
      return goal ? `${goal.name} já passou de 75% de progresso.` : 'Uma meta entrou na reta final.';
    },
  },
  {
    id: 'rule-leisure',
    priority: 3,
    title: 'Fim de semana econômico',
    objective: 'Passe 48 horas sem novos gastos em Lazer.',
    rewardXP: 100,
    target: 2,
    durationHours: 48,
    blockedCategory: 'Lazer',
    check: state => {
      const totals = calculateCategoryTotals(getExpensesSince(state.expenses, daysAgo(7)));
      const leisure = totals.find(item => item.name === 'Lazer');
      return Boolean(leisure && (leisure.percentage > 30 || totals[0]?.name === 'Lazer'));
    },
    reason: () => 'Lazer é a maior categoria recente ou ultrapassou 30% do período.',
  },
  {
    id: 'rule-small-expenses',
    priority: 4,
    title: 'Dia sem pequenos gastos',
    objective: 'Complete 24 horas sem uma nova despesa abaixo de R$ 30.',
    rewardXP: 80,
    target: 1,
    durationHours: 24,
    check: state => getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.amount < 30).length >= 5,
    reason: state => `${getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.amount < 30).length} pequenos gastos apareceram nos últimos 7 dias.`,
  },
  {
    id: 'rule-market',
    priority: 5,
    title: 'Compra planejada',
    objective: 'Passe 7 dias sem compras extras de Mercado.',
    rewardXP: 100,
    target: 7,
    durationHours: 7 * 24,
    blockedCategory: 'Mercado',
    check: state => {
      const recent = getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.category === 'Mercado');
      const previousStart = daysAgo(14).getTime();
      const previousEnd = daysAgo(7).getTime();
      const previous = state.expenses.filter(item => {
        const date = new Date(item.date).getTime();
        return item.category === 'Mercado' && date >= previousStart && date < previousEnd;
      });
      const recentTotal = recent.reduce((sum, item) => sum + item.amount, 0);
      const previousTotal = previous.reduce((sum, item) => sum + item.amount, 0);
      return recent.length >= 2 && recentTotal > Math.max(150, previousTotal * 1.25);
    },
    reason: () => 'Os gastos recentes de Mercado cresceram em relação ao período anterior.',
  },
  {
    id: 'rule-transport',
    priority: 6,
    title: 'Rota econômica',
    objective: 'Passe 3 dias sem um novo gasto de Transporte.',
    rewardXP: 80,
    target: 3,
    durationHours: 72,
    blockedCategory: 'Transporte',
    check: state => getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.category === 'Transporte').length >= 3,
    reason: state => `${getExpensesSince(state.expenses, daysAgo(7)).filter(item => item.category === 'Transporte').length} deslocamentos foram registrados nesta semana.`,
  },
];

function calculateTimedProgress(rule: MissionRule, state: AppState, startedAt: string): number {
  const startTime = new Date(startedAt).getTime();
  let progressStart = startTime;

  if (rule.blockedCategory) {
    const lastBlocked = state.expenses
      .filter(item => item.category === rule.blockedCategory && new Date(item.date).getTime() > startTime)
      .reduce((latest, item) => Math.max(latest, new Date(item.date).getTime()), startTime);
    progressStart = lastBlocked;
  } else if (rule.id === 'rule-small-expenses') {
    const lastSmall = state.expenses
      .filter(item => item.amount < 30 && new Date(item.date).getTime() > startTime)
      .reduce((latest, item) => Math.max(latest, new Date(item.date).getTime()), startTime);
    progressStart = lastSmall;
  }

  const elapsedHours = Math.max(0, (Date.now() - progressStart) / (60 * 60 * 1000));
  return Math.min(rule.target, rule.target <= 7 ? Math.floor(elapsedHours / 24) : elapsedHours);
}

export function calculateMissionProgress(rule: MissionRule, state: AppState, startedAt?: string | null): number {
  if (!startedAt) return 0;
  if (rule.id === 'rule-goal-final') {
    return Math.min(
      rule.target,
      state.goalContributions
        .filter(item => new Date(item.date).getTime() >= new Date(startedAt).getTime())
        .reduce((sum, item) => sum + item.amount, 0),
    );
  }
  return calculateTimedProgress(rule, state, startedAt);
}

function buildMission(rule: MissionRule, state: AppState, status: Mission['status']): Mission {
  const startedAt = status === 'active' ? state.activeMissionStartedAt ?? undefined : undefined;
  const progressValue = calculateMissionProgress(rule, state, startedAt);
  const isCurrency = rule.id === 'rule-goal-final';

  return {
    id: rule.id,
    ruleId: rule.id,
    title: rule.title,
    description: rule.reason(state),
    objective: rule.objective,
    rewardXP: rule.rewardXP,
    target: rule.target,
    progress: progressValue,
    progressLabel: isCurrency
      ? `R$ ${Math.round(progressValue)} / R$ ${rule.target}`
      : `${Math.round(progressValue)} / ${rule.target} ${rule.target === 1 ? 'dia' : 'dias'}`,
    status,
    durationHours: rule.durationHours,
    startedAt,
    expiresAt: status === 'active' ? state.activeMissionExpiresAt ?? undefined : undefined,
  };
}

export function getAvailableMissionIds(state: AppState): string[] {
  return MISSION_RULES
    .filter(rule => !state.completedMissionIds.includes(rule.id) && !state.failedMissionIds.includes(rule.id))
    .filter(rule => rule.check(state))
    .sort((a, b) => a.priority - b.priority)
    .map(rule => rule.id);
}

export function getMissionByRuleId(ruleId: string, state: AppState, status?: Mission['status']): Mission | null {
  const rule = MISSION_RULES.find(item => item.id === ruleId);
  if (!rule) return null;
  const derivedStatus = status ?? (state.activeMissionId === ruleId ? 'active' : 'available');
  return buildMission(rule, state, derivedStatus);
}

export function evaluateMissions(state: AppState): Mission | null {
  if (state.activeMissionId) return getMissionByRuleId(state.activeMissionId, state, 'active');
  const firstAvailable = state.availableMissionIds[0] ?? getAvailableMissionIds(state)[0];
  return firstAvailable ? getMissionByRuleId(firstAvailable, state, 'available') : null;
}
