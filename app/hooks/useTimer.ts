'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  type Routine,
  type Phase,
  getPhaseAtTime,
  DEFAULT_ROUTINE,
} from '../lib/routine';

// ============================================
// Timer Types
// ============================================

/** Timer status values */
export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

/** Core timer state (internal) */
interface TimerState {
  status: TimerStatus;
  startedAtMs: number | null;
  pausedAtMs: number | null;
  pausedTotalMs: number;
}

/** Computed timer values exposed to components */
export interface TimerData {
  status: TimerStatus;
  elapsedMs: number;
  currentPhaseIndex: number;
  currentPhase: Phase;
  phaseRemainingMs: number;
  totalRemainingMs: number;
  phaseProgress: number;
  totalProgress: number;
}

/** Actions available from useTimer hook */
export interface TimerActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  toggle: () => void;
}

/** Return type for useTimer hook */
export type UseTimerReturn = [TimerData, TimerActions];

// ============================================
// Initial State
// ============================================

const initialState: TimerState = {
  status: 'idle',
  startedAtMs: null,
  pausedAtMs: null,
  pausedTotalMs: 0,
};

// ============================================
// useTimer Hook
// ============================================

/**
 * useTimer Hook
 *
 * Core timer logic using absolute timestamps for accuracy.
 * This approach is immune to setInterval drift and browser throttling.
 *
 * @param routine - The workout routine to use (defaults to DEFAULT_ROUTINE)
 * @returns Tuple of [timerData, timerActions]
 *
 * @example
 * ```tsx
 * const [timer, actions] = useTimer();
 *
 * // Read timer state
 * console.log(timer.status);           // 'idle' | 'running' | 'paused' | 'done'
 * console.log(timer.currentPhase);     // { id: 0, name: 'Warmup', ... }
 * console.log(timer.phaseRemainingMs); // 600000 (10 minutes in ms)
 *
 * // Control timer
 * actions.start();   // Start from idle
 * actions.pause();   // Pause running timer
 * actions.resume();  // Resume paused timer
 * actions.reset();   // Reset to idle
 * actions.toggle();  // Toggle pause/resume (or start if idle)
 * ```
 */
export function useTimer(routine: Routine = DEFAULT_ROUTINE): UseTimerReturn {
  // Core timer state
  const [state, setState] = useState<TimerState>(initialState);

  // Track current time for re-renders (updated by animation frame)
  const [now, setNow] = useState<number>(Date.now());

  // Animation frame reference for cleanup
  const frameRef = useRef<number | null>(null);

  // Track previous phase for transition detection
  const prevPhaseIndexRef = useRef<number>(0);

  // ----------------------------------------
  // Calculate elapsed time based on state
  // ----------------------------------------
  const calculateElapsed = useCallback(
    (currentTime: number): number => {
      switch (state.status) {
        case 'idle':
          return 0;
        case 'running':
          if (state.startedAtMs === null) return 0;
          return currentTime - state.startedAtMs - state.pausedTotalMs;
        case 'paused':
          if (state.startedAtMs === null || state.pausedAtMs === null) return 0;
          return state.pausedAtMs - state.startedAtMs - state.pausedTotalMs;
        case 'done':
          return routine.totalDurationMs;
        default:
          return 0;
      }
    },
    [state, routine.totalDurationMs]
  );

  // ----------------------------------------
  // Compute derived timer data
  // ----------------------------------------
  const timerData = useMemo((): TimerData => {
    const elapsedMs = calculateElapsed(now);
    const phaseInfo = getPhaseAtTime(elapsedMs, routine);

    return {
      status: state.status,
      elapsedMs,
      currentPhaseIndex: phaseInfo.phaseIndex,
      currentPhase: phaseInfo.phase,
      phaseRemainingMs: phaseInfo.phaseRemainingMs,
      totalRemainingMs: Math.max(0, routine.totalDurationMs - elapsedMs),
      phaseProgress: phaseInfo.phaseProgress,
      totalProgress: elapsedMs / routine.totalDurationMs,
    };
  }, [state.status, now, routine, calculateElapsed]);

  // ----------------------------------------
  // Animation loop (when running)
  // ----------------------------------------
  useEffect(() => {
    if (state.status !== 'running') {
      // Cancel any pending frame when not running
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    const tick = () => {
      const currentTime = Date.now();
      const elapsed = calculateElapsed(currentTime);

      // Check if workout is complete
      if (elapsed >= routine.totalDurationMs) {
        setState((prev) => ({
          ...prev,
          status: 'done',
        }));
        return;
      }

      // Update current time to trigger re-render
      setNow(currentTime);

      // Schedule next frame
      frameRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop
    frameRef.current = requestAnimationFrame(tick);

    // Cleanup on unmount or when status changes
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [state.status, calculateElapsed, routine.totalDurationMs]);

  // ----------------------------------------
  // Timer Actions
  // ----------------------------------------

  const start = useCallback(() => {
    if (state.status !== 'idle') return;

    const startTime = Date.now();
    setState({
      status: 'running',
      startedAtMs: startTime,
      pausedAtMs: null,
      pausedTotalMs: 0,
    });
    setNow(startTime);
    prevPhaseIndexRef.current = 0;
  }, [state.status]);

  const pause = useCallback(() => {
    if (state.status !== 'running') return;

    const pauseTime = Date.now();
    setState((prev) => ({
      ...prev,
      status: 'paused',
      pausedAtMs: pauseTime,
    }));
  }, [state.status]);

  const resume = useCallback(() => {
    if (state.status !== 'paused') return;
    if (state.pausedAtMs === null) return;

    const resumeTime = Date.now();
    const pauseDuration = resumeTime - state.pausedAtMs;

    setState((prev) => ({
      ...prev,
      status: 'running',
      pausedAtMs: null,
      pausedTotalMs: prev.pausedTotalMs + pauseDuration,
    }));
    setNow(resumeTime);
  }, [state.status, state.pausedAtMs]);

  const reset = useCallback(() => {
    // Cancel any pending animation frame
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    setState(initialState);
    setNow(Date.now());
    prevPhaseIndexRef.current = 0;
  }, []);

  const toggle = useCallback(() => {
    switch (state.status) {
      case 'idle':
        start();
        break;
      case 'running':
        pause();
        break;
      case 'paused':
        resume();
        break;
      case 'done':
        reset();
        break;
    }
  }, [state.status, start, pause, resume, reset]);

  // ----------------------------------------
  // Memoize actions object
  // ----------------------------------------
  const actions = useMemo(
    (): TimerActions => ({
      start,
      pause,
      resume,
      reset,
      toggle,
    }),
    [start, pause, resume, reset, toggle]
  );

  return [timerData, actions];
}

export default useTimer;
