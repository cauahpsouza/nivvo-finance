'use client';

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { ChallengeModuleState, ChallengeRun } from '../types/challenge';
import { CHALLENGE_SCHEMA_VERSION } from '../lib/challenge/config';
import { advanceChallengeDay, createChallengeRun, expireChallengeRun, finishBossIntro, finishChallengeTransition, queueBossChoice, queueChallengeChoice, resolveQueuedBossChoice, resolveQueuedChallengeChoice, revealChallengeResults } from '../lib/challenge/engine';
import { loadChallengeState, persistChallengeState } from '../lib/challenge/storage';
import { pauseChallengeTimer, resumeChallengeTimer } from '../lib/challenge/timer';

type Action =
  | { type: 'hydrate'; state: ChallengeModuleState }
  | { type: 'start'; run: ChallengeRun }
  | { type: 'queue-choice'; choiceId: string; nowMs: number; completedAt: string }
  | { type: 'resolve-choice' } | { type: 'next-day' } | { type: 'finish-transition' } | { type: 'finish-boss-intro' }
  | { type: 'queue-boss'; choiceId: string; nowMs: number; completedAt: string }
  | { type: 'resolve-boss'; nowMs: number; completedAt: string }
  | { type: 'resume-timer'; nowMs: number } | { type: 'pause-timer'; nowMs: number }
  | { type: 'expire-timer'; nowMs: number; completedAt: string } | { type: 'reveal-results' };

const initialState: ChallengeModuleState = { challengeSchemaVersion: CHALLENGE_SCHEMA_VERSION, hydrated: false, run: null };
function reducer(state: ChallengeModuleState, action: Action): ChallengeModuleState {
  if (action.type === 'hydrate') return action.state;
  if (action.type === 'start') return { ...state, hydrated: true, run: action.run };
  if (!state.run) return state;
  if (action.type === 'queue-choice') return { ...state, run: queueChallengeChoice(state.run, action.choiceId, action.nowMs, action.completedAt) };
  if (action.type === 'resolve-choice') return { ...state, run: resolveQueuedChallengeChoice(state.run) };
  if (action.type === 'next-day') return { ...state, run: advanceChallengeDay(state.run) };
  if (action.type === 'finish-transition') return { ...state, run: finishChallengeTransition(state.run) };
  if (action.type === 'finish-boss-intro') return { ...state, run: finishBossIntro(state.run) };
  if (action.type === 'queue-boss') return { ...state, run: queueBossChoice(state.run, action.choiceId, action.nowMs, action.completedAt) };
  if (action.type === 'resolve-boss') return { ...state, run: resolveQueuedBossChoice(state.run, action.completedAt, action.nowMs) };
  if (action.type === 'resume-timer') return { ...state, run: resumeChallengeTimer(state.run, action.nowMs) };
  if (action.type === 'pause-timer') return { ...state, run: pauseChallengeTimer(state.run, action.nowMs) };
  if (action.type === 'expire-timer') return { ...state, run: expireChallengeRun(state.run, action.completedAt, action.nowMs) };
  if (action.type === 'reveal-results') return { ...state, run: revealChallengeResults(state.run) };
  return state;
}

interface Value {
  state: ChallengeModuleState; persistenceError: string | null; startChallenge: (nickname: string) => void; choose: (id: string) => void; resolveChoice: () => void;
  nextDay: () => void; finishTransition: () => void; finishBossIntro: () => void; chooseBoss: (id: string) => void; resolveBoss: () => void;
  resumeTimer: (nowMs?: number) => void; pauseTimer: (nowMs?: number) => void; expireTimer: (nowMs?: number) => void; revealResults: () => void;
}
const Context = createContext<Value | null>(null);
const clock = () => ({ nowMs: Date.now(), completedAt: new Date().toISOString() });
const createRunId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { dispatch({ type: 'hydrate', state: loadChallengeState() }); }, []);
  useEffect(() => {
    stateRef.current = state;
    if (!state.hydrated) return;
    const message = persistChallengeState(state) ? null : 'Não foi possível guardar seu progresso neste navegador.';
    queueMicrotask(() => setPersistenceError(message));
  }, [state]);
  useEffect(() => {
    const pauseAndSave = (render: boolean) => {
      const current = stateRef.current;
      if (!current.run) return;
      const run = pauseChallengeTimer(current.run, Date.now());
      if (run === current.run) return;
      const paused = { ...current, run };
      stateRef.current = paused;
      persistChallengeState(paused);
      if (render) dispatch({ type: 'hydrate', state: paused });
    };
    const visibility = () => { if (document.visibilityState !== 'visible') pauseAndSave(true); };
    document.addEventListener('visibilitychange', visibility);
    const pageHide = () => pauseAndSave(false);
    window.addEventListener('pagehide', pageHide);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pageHide); };
  }, []);
  const startChallenge = useCallback((nickname: string) => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    dispatch({ type: 'start', run: createChallengeRun({ nickname, seed, runId: createRunId(), startedAt: new Date().toISOString() }) });
  }, []);
  const choose = useCallback((id: string) => dispatch({ type: 'queue-choice', choiceId: id, ...clock() }), []);
  const resolveChoice = useCallback(() => dispatch({ type: 'resolve-choice' }), []);
  const nextDay = useCallback(() => dispatch({ type: 'next-day' }), []);
  const finishTransition = useCallback(() => dispatch({ type: 'finish-transition' }), []);
  const finishBossIntro = useCallback(() => dispatch({ type: 'finish-boss-intro' }), []);
  const chooseBoss = useCallback((id: string) => dispatch({ type: 'queue-boss', choiceId: id, ...clock() }), []);
  const resolveBoss = useCallback(() => dispatch({ type: 'resolve-boss', ...clock() }), []);
  const resumeTimer = useCallback((nowMs = Date.now()) => dispatch({ type: 'resume-timer', nowMs }), []);
  const pauseTimer = useCallback((nowMs = Date.now()) => dispatch({ type: 'pause-timer', nowMs }), []);
  const expireTimer = useCallback((nowMs = Date.now()) => dispatch({ type: 'expire-timer', nowMs, completedAt: new Date(nowMs).toISOString() }), []);
  const revealResults = useCallback(() => dispatch({ type: 'reveal-results' }), []);
  const value: Value = {
    state, persistenceError, startChallenge,
    choose, resolveChoice, nextDay, finishTransition, finishBossIntro, chooseBoss, resolveBoss,
    resumeTimer, pauseTimer, expireTimer, revealResults,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useChallenge() {
  const context = useContext(Context);
  if (!context) throw new Error('useChallenge precisa estar dentro de ChallengeProvider.');
  return context;
}
