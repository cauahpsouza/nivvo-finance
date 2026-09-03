import { AppState, LevelDefinition, LevelInfo, XPEvent } from '../types';

export const XP_REWARDS = {
  expense_logged: 10,
  first_goal: 50,
  goal_funded: 20,
  mission_completed: 100,
  achievement_unlocked: 50,
  goal_completed: 300,
} as const;

export type XPRewardKey = keyof typeof XP_REWARDS;

export const XP_MESSAGES: Record<XPRewardKey, { title: string; label: string }> = {
  expense_logged: { title: 'Registro atualizado', label: 'Organização' },
  first_goal: { title: 'Meta criada', label: 'Primeiro passo' },
  goal_funded: { title: 'Meta atualizada', label: 'Disciplina' },
  mission_completed: { title: 'Missão concluída', label: 'Desafio completo' },
  achievement_unlocked: { title: 'Conquista desbloqueada', label: 'Conquista' },
  goal_completed: { title: 'Meta concluída', label: 'Objetivo alcançado' },
};

export const LEVELS: LevelDefinition[] = [
  {
    number: 1,
    name: 'Iniciante',
    minXP: 0,
    unlocks: [{ id: 'badge-iniciante', kind: 'badge', name: 'Emblema Iniciante', description: 'Marca o início da sua jornada.' }],
  },
  {
    number: 2,
    name: 'Aprendiz',
    minXP: 200,
    unlocks: [{ id: 'badge-aprendiz', kind: 'badge', name: 'Emblema Aprendiz', description: 'Reconhece os primeiros hábitos organizados.' }],
  },
  {
    number: 3,
    name: 'Organizado',
    minXP: 400,
    unlocks: [{ id: 'frame-01', kind: 'frame', name: 'Moldura Traço 01', description: 'Moldura de perfil com detalhe verde.' }],
  },
  {
    number: 4,
    name: 'Controlado',
    minXP: 600,
    unlocks: [{ id: 'progress-segmented', kind: 'progress-style', name: 'Barra segmentada', description: 'Novo estilo para painéis de progressão.' }],
  },
  {
    number: 5,
    name: 'Estrategista',
    minXP: 900,
    unlocks: [{ id: 'frame-02', kind: 'frame', name: 'Moldura Traço 02', description: 'Moldura de perfil com corte duplo.' }],
  },
  {
    number: 6,
    name: 'Especialista',
    minXP: 1400,
    unlocks: [{ id: 'badge-especialista', kind: 'badge', name: 'Emblema Especialista', description: 'Símbolo de domínio da rotina financeira.' }],
  },
  {
    number: 7,
    name: 'Mestre',
    minXP: 2000,
    unlocks: [
      { id: 'badge-mestre', kind: 'badge', name: 'Emblema Mestre', description: 'Emblema final da jornada Nivvo.' },
      { id: 'frame-master', kind: 'frame', name: 'Moldura Mestre', description: 'Moldura especial do nível máximo.' },
    ],
  },
];

export function getLevelInfo(xp: number): LevelInfo {
  const safeXP = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let current = LEVELS[0];

  for (const level of LEVELS) {
    if (safeXP >= level.minXP) current = level;
  }

  const currentIndex = LEVELS.findIndex(level => level.number === current.number);
  const next = LEVELS[currentIndex + 1] ?? null;
  const isMax = next === null;

  if (isMax) {
    return {
      number: current.number,
      name: current.name,
      minXP: current.minXP,
      nextLevelMinXP: null,
      progress: 100,
      remaining: 0,
      nextLevelName: null,
      isMax: true,
      unlocks: current.unlocks,
    };
  }

  const range = next.minXP - current.minXP;
  const progress = range > 0 ? ((safeXP - current.minXP) / range) * 100 : 100;

  return {
    number: current.number,
    name: current.name,
    minXP: current.minXP,
    nextLevelMinXP: next.minXP,
    progress: Math.max(0, Math.min(100, progress)),
    remaining: Math.max(0, next.minXP - safeXP),
    nextLevelName: next.name,
    isMax: false,
    unlocks: current.unlocks,
  };
}

export function getUnlockedLevelRewards(xp: number) {
  const level = getLevelInfo(xp);
  return LEVELS.filter(item => item.number <= level.number).flatMap(item => item.unlocks);
}

export function awardXP(
  state: AppState,
  rewardKey: string,
  amount: number,
  reason: string,
): { state: AppState; xpGained: number; previousLevel: number; newLevel: number } {
  const previousLevel = getLevelInfo(state.xp).number;

  if (state.grantedRewardIds.includes(rewardKey)) {
    return { state, xpGained: 0, previousLevel, newLevel: previousLevel };
  }

  const safeAmount = Math.max(0, amount);
  const newXP = state.xp + safeAmount;
  const xpEvent: XPEvent = {
    id: crypto.randomUUID(),
    reason,
    amount: safeAmount,
    date: new Date().toISOString(),
    key: rewardKey,
  };

  const newState: AppState = {
    ...state,
    xp: newXP,
    xpHistory: [xpEvent, ...state.xpHistory],
    grantedRewardIds: [...state.grantedRewardIds, rewardKey],
  };

  return {
    state: newState,
    xpGained: safeAmount,
    previousLevel,
    newLevel: getLevelInfo(newXP).number,
  };
}

export function formatLevelNumber(num: number): string {
  return num.toString().padStart(2, '0');
}
