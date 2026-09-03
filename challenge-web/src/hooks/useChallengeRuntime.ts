"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ChallengeRun } from '../types/challenge';
import { getChallengeTimerRemainingMs, isChallengeTimerPhase } from '../lib/challenge/timer';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { MOTION_MS } from '../lib/motion';

const subscribeVisibility = (callback: () => void) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};
const getVisibility = () => document.visibilityState === 'visible';
const getServerVisibility = () => true;

interface ChallengeRuntimeOptions {
  run: ChallengeRun | null;
  active: boolean;
  resumeTimer: (nowMs?: number) => void;
  pauseTimer: (nowMs?: number) => void;
  expireTimer: (nowMs?: number) => void;
  resolveChoice: () => void;
  resolveBoss: () => void;
  finishTransition: () => void;
  finishBossIntro: () => void;
}

export function useChallengeRuntime({
  run,
  active,
  resumeTimer,
  pauseTimer,
  expireTimer,
  resolveChoice,
  resolveBoss,
  finishTransition,
  finishBossIntro,
}: ChallengeRuntimeOptions) {
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = useSyncExternalStore(subscribeVisibility, getVisibility, getServerVisibility);
  const [remainingMs, setRemainingMs] = useState(run?.decisionTimer.remainingMs ?? 120_000);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const expiredRun = useRef<string | null>(null);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  const phaseKey = useMemo(
    () => run ? `${run.id}:${run.phase}:${run.day}:${run.bossId ?? ''}` : 'none',
    [run],
  );

  useEffect(() => {
    if (!run) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const short = reducedMotion ? 20 : MOTION_MS.instant;
    const transition = reducedMotion ? 40 : MOTION_MS.challengeTransition;
    const bossIntro = reducedMotion ? 40 : MOTION_MS.reveal;

    if (run.phase === 'resolving') timeout = setTimeout(resolveChoice, short);
    if (run.phase === 'boss-resolving') timeout = setTimeout(resolveBoss, short);
    if (run.phase === 'transition') timeout = setTimeout(finishTransition, transition);
    if (run.phase === 'boss-intro') timeout = setTimeout(finishBossIntro, bossIntro);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [finishBossIntro, finishTransition, reducedMotion, resolveBoss, resolveChoice, run]);

  useEffect(() => {
    const currentRun = runRef.current;
    if (!currentRun || !active || !pageVisible || !isChallengeTimerPhase(currentRun.phase)) {
      if (currentRun?.decisionTimer.activeSinceMs !== null) pauseTimer(Date.now());
      return;
    }

    setReadyKey(null);
    const entryDelay = reducedMotion ? 20 : currentRun.phase === 'boss' ? MOTION_MS.challengeScene : MOTION_MS.slow;
    const timeout = setTimeout(() => {
      const nowMs = Date.now();
      const latestRun = runRef.current;
      if (!latestRun || getChallengeTimerRemainingMs(latestRun, nowMs) <= 0) {
        expireTimer(nowMs);
        return;
      }
      setReadyKey(phaseKey);
      resumeTimer(nowMs);
    }, entryDelay);
    return () => clearTimeout(timeout);
  }, [active, expireTimer, pageVisible, pauseTimer, phaseKey, reducedMotion, resumeTimer]);

  useEffect(() => {
    if (!run) return;
    const update = () => {
      const nowMs = Date.now();
      const nextRemaining = getChallengeTimerRemainingMs(run, nowMs);
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0 && !run.result && expiredRun.current !== run.id) {
        expiredRun.current = run.id;
        expireTimer(nowMs);
      }
    };
    const frame = requestAnimationFrame(update);
    if (!active || !pageVisible || readyKey !== phaseKey || run.decisionTimer.activeSinceMs === null) {
      return () => cancelAnimationFrame(frame);
    }
    const interval = window.setInterval(update, 200);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [active, expireTimer, pageVisible, phaseKey, readyKey, run]);

  useEffect(() => {
    if (run && run.decisionTimer.remainingMs > 0) expiredRun.current = null;
  }, [run]);

  return {
    remainingMs,
    interactionReady: Boolean(
      run
      && active
      && pageVisible
      && readyKey === phaseKey
      && isChallengeTimerPhase(run.phase)
      && remainingMs > 0,
    ),
  };
}
