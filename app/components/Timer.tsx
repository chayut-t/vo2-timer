'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  PHASE_COLOR_CLASSES,
  PHASE_TEXT_COLORS,
  DEFAULT_ROUTINE,
  type PhaseType,
} from '../lib/routine';

// ============================================
// Feedback Hook (simplified for MVP)
// ============================================

const STORAGE_KEY = 'vo2timer_feedback_enabled';

function useFeedback() {
  const [enabled, setEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setEnabled(stored === 'true');
    }
  }, []);

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playBeep = useCallback(
    async (frequency: number = 800, duration: number = 150) => {
      if (!enabled) return;
      try {
        const ctx = getAudioContext();

        // Resume AudioContext if suspended (required on mobile browsers)
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration / 1000);
      } catch {
        // Audio not supported or resume failed
      }
    },
    [enabled, getAudioContext]
  );

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!enabled) return;
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(pattern);
        }
      } catch {
        // Vibration not supported
      }
    },
    [enabled]
  );

  const triggerTransition = useCallback(
    (toPhaseType: PhaseType) => {
      if (!enabled) return;

      // Different patterns for different phase types
      switch (toPhaseType) {
        case 'hard':
          // Triple beep + long vibration for hard phases
          playBeep(900, 150);
          setTimeout(() => playBeep(900, 150), 250);
          setTimeout(() => playBeep(900, 150), 500);
          vibrate(300);
          break;
        case 'easy':
        case 'cooldown':
          // Double beep + short vibration
          playBeep(600, 150);
          setTimeout(() => playBeep(600, 150), 250);
          vibrate(100);
          break;
        case 'warmup':
          // Single beep
          playBeep(800, 150);
          vibrate(100);
          break;
      }
    },
    [enabled, playBeep, vibrate]
  );

  const triggerComplete = useCallback(() => {
    if (!enabled) return;
    // Success pattern
    playBeep(523, 150); // C
    setTimeout(() => playBeep(659, 150), 150); // E
    setTimeout(() => playBeep(784, 200), 300); // G
    vibrate([100, 50, 100, 50, 200]);
  }, [enabled, playBeep, vibrate]);

  return useMemo(
    () => ({ enabled, toggle, triggerTransition, triggerComplete }),
    [enabled, toggle, triggerTransition, triggerComplete]
  );
}

// ============================================
// Timer Component
// ============================================

export default function Timer() {
  const [timer, actions] = useTimer(DEFAULT_ROUTINE);
  const feedback = useFeedback();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const prevPhaseIndexRef = useRef(timer.currentPhaseIndex);
  const prevStatusRef = useRef(timer.status);

  // Trigger feedback on workout START (idle → running)
  useEffect(() => {
    if (prevStatusRef.current === 'idle' && timer.status === 'running') {
      // Single beep + short vibration per SPEC F4
      feedback.triggerTransition('warmup');
    }
    prevStatusRef.current = timer.status;
  }, [timer.status, feedback]);

  // Detect phase transitions and trigger feedback (after first phase)
  useEffect(() => {
    if (timer.status === 'running' && timer.currentPhaseIndex !== prevPhaseIndexRef.current) {
      // Only trigger if not the first phase (start feedback already handled above)
      if (prevPhaseIndexRef.current !== 0 || timer.currentPhaseIndex !== 0) {
        feedback.triggerTransition(timer.currentPhase.type);
      }
      prevPhaseIndexRef.current = timer.currentPhaseIndex;
    }
  }, [timer.status, timer.currentPhaseIndex, timer.currentPhase.type, feedback]);

  // Trigger complete feedback when done
  useEffect(() => {
    if (timer.status === 'done') {
      feedback.triggerComplete();
    }
  }, [timer.status, feedback]);

  // Wake Lock: Keep screen awake during workout (AC7.4)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && timer.status === 'running') {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
          // Wake lock request failed (e.g., low battery, not supported)
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch {
          // Release failed
        }
      }
    };

    if (timer.status === 'running') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-acquire wake lock when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timer.status === 'running') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [timer.status]);

  // Handle reset with confirmation
  const handleResetRequest = useCallback(() => {
    if (timer.status === 'running' || timer.status === 'paused') {
      setShowResetConfirm(true);
    } else {
      actions.reset();
    }
  }, [timer.status, actions]);

  const handleResetConfirm = useCallback(() => {
    setShowResetConfirm(false);
    actions.reset();
  }, [actions]);

  const handleResetCancel = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  // Get phase-specific styles
  const phaseColorClass = PHASE_COLOR_CLASSES[timer.currentPhase.type];
  const phaseTextColor = PHASE_TEXT_COLORS[timer.currentPhase.type];

  // Determine if timer display should pulse (when paused)
  const isPaused = timer.status === 'paused';
  const isDone = timer.status === 'done';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto px-4 py-8 gap-6">
      {/* Phase Indicator */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold ${phaseColorClass}`}
        >
          {timer.currentPhase.name}
        </div>
        <div className="text-zinc-400 text-sm">
          Phase {timer.currentPhaseIndex + 1} of {DEFAULT_ROUTINE.phases.length}
        </div>
      </div>

      {/* Big Countdown Display */}
      <div
        className={`font-mono text-8xl sm:text-9xl font-bold tracking-tight tabular-nums
          ${isDone ? 'text-green-500' : phaseTextColor}
          ${isPaused ? 'animate-pulse opacity-70' : ''}
        `}
      >
        {isDone ? 'Done!' : formatTime(timer.phaseRemainingMs)}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${phaseColorClass.split(' ')[0]}`}
          style={{ width: `${timer.phaseProgress * 100}%` }}
        />
      </div>

      {/* Total Progress */}
      <div className="flex justify-between w-full text-sm text-zinc-500">
        <span>Total: {formatTime(timer.totalRemainingMs)} remaining</span>
        <span>{Math.round(timer.totalProgress * 100)}%</span>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 mt-4">
        {/* Primary Button */}
        {timer.status === 'idle' && (
          <button
            onClick={actions.start}
            className="px-8 py-4 min-w-[120px] bg-green-600 hover:bg-green-500
              text-white font-semibold rounded-full text-lg
              transition-colors active:scale-95 touch-manipulation"
          >
            Start
          </button>
        )}

        {timer.status === 'running' && (
          <button
            onClick={actions.pause}
            className="px-8 py-4 min-w-[120px] bg-amber-600 hover:bg-amber-500
              text-white font-semibold rounded-full text-lg
              transition-colors active:scale-95 touch-manipulation"
          >
            Pause
          </button>
        )}

        {timer.status === 'paused' && (
          <button
            onClick={actions.resume}
            className="px-8 py-4 min-w-[120px] bg-green-600 hover:bg-green-500
              text-white font-semibold rounded-full text-lg
              transition-colors active:scale-95 touch-manipulation"
          >
            Resume
          </button>
        )}

        {timer.status === 'done' && (
          <button
            onClick={actions.reset}
            className="px-8 py-4 min-w-[120px] bg-blue-600 hover:bg-blue-500
              text-white font-semibold rounded-full text-lg
              transition-colors active:scale-95 touch-manipulation"
          >
            Reset
          </button>
        )}

        {/* Secondary Button (Reset) - only when running or paused */}
        {(timer.status === 'running' || timer.status === 'paused') && (
          <button
            onClick={handleResetRequest}
            className="px-6 py-4 min-w-[100px] border-2 border-zinc-600 hover:border-zinc-500
              text-zinc-300 hover:text-white font-semibold rounded-full text-lg
              transition-colors active:scale-95 touch-manipulation"
          >
            Reset
          </button>
        )}
      </div>

      {/* Feedback Toggle */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={feedback.toggle}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            feedback.enabled ? 'bg-green-600' : 'bg-zinc-700'
          }`}
          aria-label={feedback.enabled ? 'Disable sound and vibration' : 'Enable sound and vibration'}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
              feedback.enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-zinc-400">
          {feedback.enabled ? 'Sound & Vibration On' : 'Sound & Vibration Off'}
        </span>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-semibold text-white mb-2">Reset Workout?</h2>
            <p className="text-zinc-400 mb-6">Your progress will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={handleResetCancel}
                className="flex-1 px-4 py-3 border border-zinc-600 text-zinc-300
                  rounded-full font-medium hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                className="flex-1 px-4 py-3 bg-red-600 text-white
                  rounded-full font-medium hover:bg-red-500 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
