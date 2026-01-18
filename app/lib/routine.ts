// ============================================
// Phase & Routine Types
// ============================================

/** Phase intensity types */
export type PhaseType = 'warmup' | 'hard' | 'easy' | 'cooldown';

/** Single phase definition */
export interface Phase {
  /** Unique identifier (0-indexed) */
  id: number;
  /** Display name (e.g., "Hard #1") */
  name: string;
  /** Phase intensity type */
  type: PhaseType;
  /** Duration in milliseconds */
  durationMs: number;
}

/** Complete workout routine */
export interface Routine {
  /** Human-readable name */
  name: string;
  /** Ordered list of phases */
  phases: Phase[];
  /** Total duration in milliseconds */
  totalDurationMs: number;
}

// ============================================
// Duration Constants
// ============================================

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

// ============================================
// Default Routine
// ============================================

/** Default 4x4 VO₂max routine */
export const DEFAULT_ROUTINE: Routine = {
  name: 'VO₂max 4x4',
  phases: [
    { id: 0, name: 'Warmup',   type: 'warmup',   durationMs: 10 * MINUTES },
    { id: 1, name: 'Hard #1',  type: 'hard',     durationMs: 4 * MINUTES },
    { id: 2, name: 'Easy #1',  type: 'easy',     durationMs: 3 * MINUTES },
    { id: 3, name: 'Hard #2',  type: 'hard',     durationMs: 4 * MINUTES },
    { id: 4, name: 'Easy #2',  type: 'easy',     durationMs: 3 * MINUTES },
    { id: 5, name: 'Hard #3',  type: 'hard',     durationMs: 4 * MINUTES },
    { id: 6, name: 'Easy #3',  type: 'easy',     durationMs: 3 * MINUTES },
    { id: 7, name: 'Hard #4',  type: 'hard',     durationMs: 4 * MINUTES },
    { id: 8, name: 'Easy #4',  type: 'easy',     durationMs: 3 * MINUTES },
    { id: 9, name: 'Cooldown', type: 'cooldown', durationMs: 5 * MINUTES },
  ],
  totalDurationMs: 43 * MINUTES,
};

// ============================================
// Phase Colors
// ============================================

/** Phase type to hex color mapping */
export const PHASE_COLORS: Record<PhaseType, string> = {
  warmup:   '#F59E0B', // amber-500
  hard:     '#EF4444', // red-500
  easy:     '#22C55E', // green-500
  cooldown: '#3B82F6', // blue-500
};

/** Phase type to Tailwind class mapping */
export const PHASE_COLOR_CLASSES: Record<PhaseType, string> = {
  warmup:   'bg-amber-500 text-white',
  hard:     'bg-red-500 text-white',
  easy:     'bg-green-500 text-white',
  cooldown: 'bg-blue-500 text-white',
};

/** Phase type to Tailwind text color class */
export const PHASE_TEXT_COLORS: Record<PhaseType, string> = {
  warmup:   'text-amber-500',
  hard:     'text-red-500',
  easy:     'text-green-500',
  cooldown: 'text-blue-500',
};

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate cumulative start times for each phase
 * @param routine - The workout routine
 * @returns Array where index i = start time of phase i in ms
 */
export function calculatePhaseStartTimes(routine: Routine): number[] {
  const startTimes: number[] = [];
  let cumulative = 0;

  for (const phase of routine.phases) {
    startTimes.push(cumulative);
    cumulative += phase.durationMs;
  }

  return startTimes;
}

/**
 * Find current phase based on elapsed time
 * @param elapsedMs - Elapsed time in milliseconds
 * @param routine - The workout routine
 * @returns Phase index (0-indexed), or -1 if workout complete
 */
export function findCurrentPhaseIndex(
  elapsedMs: number,
  routine: Routine
): number {
  if (elapsedMs < 0) return 0;
  if (elapsedMs >= routine.totalDurationMs) return -1;

  const startTimes = calculatePhaseStartTimes(routine);

  for (let i = routine.phases.length - 1; i >= 0; i--) {
    if (elapsedMs >= startTimes[i]) {
      return i;
    }
  }

  return 0;
}

/**
 * Get phase info at a given elapsed time
 * @param elapsedMs - Elapsed time in milliseconds
 * @param routine - The workout routine
 * @returns Object with phase, phase remaining time, and phase progress
 */
export function getPhaseAtTime(
  elapsedMs: number,
  routine: Routine
): {
  phase: Phase;
  phaseIndex: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  phaseProgress: number;
} {
  const clampedElapsed = Math.max(0, Math.min(elapsedMs, routine.totalDurationMs));
  const phaseIndex = findCurrentPhaseIndex(clampedElapsed, routine);

  // If workout is complete, return last phase with 0 remaining
  if (phaseIndex === -1) {
    const lastPhase = routine.phases[routine.phases.length - 1];
    return {
      phase: lastPhase,
      phaseIndex: routine.phases.length - 1,
      phaseElapsedMs: lastPhase.durationMs,
      phaseRemainingMs: 0,
      phaseProgress: 1,
    };
  }

  const phase = routine.phases[phaseIndex];
  const startTimes = calculatePhaseStartTimes(routine);
  const phaseStartMs = startTimes[phaseIndex];
  const phaseElapsedMs = clampedElapsed - phaseStartMs;
  const phaseRemainingMs = phase.durationMs - phaseElapsedMs;
  const phaseProgress = phaseElapsedMs / phase.durationMs;

  return {
    phase,
    phaseIndex,
    phaseElapsedMs,
    phaseRemainingMs,
    phaseProgress,
  };
}

/**
 * Format milliseconds as MM:SS string
 * @param ms - Time in milliseconds
 * @returns Formatted string like "04:30"
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate total duration of a routine
 * @param routine - The workout routine
 * @returns Total duration in milliseconds
 */
export function calculateTotalDuration(routine: Routine): number {
  return routine.phases.reduce((sum, phase) => sum + phase.durationMs, 0);
}
