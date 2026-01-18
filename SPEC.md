# VO₂max Timer - Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-01-18
> **Status:** Complete

## Overview

A mobile-first web application that guides users through a 4x4 VO₂max interval training workout. The timer displays countdown time, current phase, and provides audio/haptic feedback on phase transitions.

**Total Workout Duration:** 43 minutes

---

## Table of Contents

1. [Feature Specifications](#feature-specifications)
2. [Technical Specifications](#technical-specifications)
3. [Acceptance Criteria](#acceptance-criteria)

---

## Feature Specifications

### F1: Countdown Display

**User Story:** As a user, I want to see a large, easy-to-read countdown timer so I can track my progress during exercise.

**Description:**
- Display remaining time in `MM:SS` format
- Large, high-contrast text readable from arm's length
- Updates every 100ms for smooth visual feedback
- Shows remaining time for current phase (not total workout)

**Visual Requirements:**
- Font size: Minimum 48px on mobile (375px viewport)
- Font: Monospace or tabular numbers (prevents layout shift)
- Color: High contrast (dark on light or light on dark)
- Position: Center of screen, upper half

**Display States:**

| Timer Status | Display |
|--------------|---------|
| `idle` | Shows first phase duration (e.g., "10:00") |
| `running` | Counts down from current phase remaining |
| `paused` | Frozen at paused time, visually distinct (e.g., pulsing or dimmed) |
| `done` | Shows "00:00" or "Done!" message |

---

### F2: Phase Tracking

**User Story:** As a user, I want to know which phase I'm in and what's coming next so I can mentally prepare for intensity changes.

**Description:**
- Display current phase name prominently
- Show phase type indicator (warmup/hard/easy/cooldown)
- Visual differentiation between hard and easy phases

**Phase Display Requirements:**
- Phase label: Clear text (e.g., "Warmup", "Hard #1", "Easy #2", "Cooldown")
- Phase type color coding:
  - Warmup: Yellow/Orange (`#F59E0B`)
  - Hard: Red (`#EF4444`)
  - Easy: Green (`#22C55E`)
  - Cooldown: Blue (`#3B82F6`)
- Progress indicator: Show current phase number (e.g., "Phase 3 of 10")

**Phase Schedule:**

| # | Phase Name | Type | Duration | Cumulative |
|---|------------|------|----------|------------|
| 1 | Warmup | warmup | 10:00 | 10:00 |
| 2 | Hard #1 | hard | 4:00 | 14:00 |
| 3 | Easy #1 | easy | 3:00 | 17:00 |
| 4 | Hard #2 | hard | 4:00 | 21:00 |
| 5 | Easy #2 | easy | 3:00 | 24:00 |
| 6 | Hard #3 | hard | 4:00 | 28:00 |
| 7 | Easy #3 | easy | 3:00 | 31:00 |
| 8 | Hard #4 | hard | 4:00 | 35:00 |
| 9 | Easy #4 | easy | 3:00 | 38:00 |
| 10 | Cooldown | cooldown | 5:00 | 43:00 |

---

### F3: Timer Controls

**User Story:** As a user, I want simple controls to start, pause, resume, and reset my workout.

**Description:**
- Large, touch-friendly buttons
- Context-aware button labels (show only valid actions)
- Confirmation for destructive actions (reset during active workout)

**Button Specifications:**

| Timer Status | Primary Button | Secondary Button |
|--------------|----------------|------------------|
| `idle` | Start | (none) |
| `running` | Pause | Reset |
| `paused` | Resume | Reset |
| `done` | Reset | (none) |

**Button Requirements:**
- Minimum touch target: 48x48px (WCAG guideline)
- Primary button: Prominent, filled style
- Secondary button: Less prominent, outlined style
- Disabled states: Visually distinct, non-interactive

**Reset Behavior:**
- If timer is `idle` or `done`: Reset immediately (no confirmation)
- If timer is `running` or `paused`: Show confirmation dialog
  - "Reset workout? Your progress will be lost."
  - Options: "Cancel" / "Reset"

---

### F4: Audio/Haptic Feedback

**User Story:** As a user, I want audio and/or vibration alerts when phases change so I don't have to constantly watch the screen.

**Description:**
- Audio beep on phase transitions
- Haptic vibration on phase transitions (if device supports)
- User toggle to enable/disable feedback
- Distinct sounds for different transitions

**Feedback Triggers:**

| Event | Audio | Vibration |
|-------|-------|-----------|
| Workout Start | Single beep | Short pulse |
| Transition to Hard | Triple beep | Long pulse |
| Transition to Easy | Double beep | Short pulse |
| Transition to Cooldown | Double beep | Short pulse |
| Workout Complete | Success chime | Pattern pulse |

**Audio Specifications:**
- Use Web Audio API for reliability
- Frequency: 800Hz for standard beep
- Duration: 150ms per beep, 100ms gap between beeps
- Volume: User's device volume (no override)

**Haptic Specifications:**
- Use Vibration API (`navigator.vibrate()`)
- Short pulse: 100ms
- Long pulse: 300ms
- Pattern pulse: [100, 50, 100, 50, 200]

**Toggle Control:**
- Single toggle for both audio and haptic
- Default: Enabled
- Persist preference in localStorage
- Key: `vo2timer_feedback_enabled`

---

## Technical Specifications

### TypeScript Interfaces

```typescript
// ============================================
// Phase & Routine Types
// ============================================

/** Phase intensity types */
type PhaseType = 'warmup' | 'hard' | 'easy' | 'cooldown';

/** Single phase definition */
interface Phase {
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
interface Routine {
  /** Human-readable name */
  name: string;
  /** Ordered list of phases */
  phases: Phase[];
  /** Total duration in milliseconds */
  totalDurationMs: number;
}

// ============================================
// Timer State Types
// ============================================

/** Timer status values */
type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

/** Core timer state (used in useTimer hook) */
interface TimerState {
  /** Current timer status */
  status: TimerStatus;
  /** Timestamp when timer was started (ms since epoch) */
  startedAtMs: number | null;
  /** Timestamp when timer was paused (ms since epoch) */
  pausedAtMs: number | null;
  /** Total accumulated pause duration (ms) */
  pausedTotalMs: number;
}

/** Computed timer values (derived from TimerState) */
interface TimerComputed {
  /** Total elapsed time since start (ms) */
  elapsedMs: number;
  /** Current phase index (0-indexed) */
  currentPhaseIndex: number;
  /** Current phase object */
  currentPhase: Phase;
  /** Time remaining in current phase (ms) */
  phaseRemainingMs: number;
  /** Time remaining in total workout (ms) */
  totalRemainingMs: number;
  /** Progress through current phase (0-1) */
  phaseProgress: number;
  /** Progress through total workout (0-1) */
  totalProgress: number;
}

/** Combined timer data exposed by hook */
interface TimerData extends TimerComputed {
  status: TimerStatus;
}

// ============================================
// Timer Actions
// ============================================

/** Actions available from useTimer hook */
interface TimerActions {
  /** Start the timer from idle state */
  start: () => void;
  /** Pause the running timer */
  pause: () => void;
  /** Resume the paused timer */
  resume: () => void;
  /** Reset timer to idle state */
  reset: () => void;
  /** Toggle pause/resume (or start if idle) */
  toggle: () => void;
}

// ============================================
// Component Props
// ============================================

/** Timer display component props */
interface TimerDisplayProps {
  /** Time remaining in milliseconds */
  remainingMs: number;
  /** Current phase information */
  phase: Phase;
  /** Current timer status */
  status: TimerStatus;
}

/** Timer controls component props */
interface TimerControlsProps {
  /** Current timer status */
  status: TimerStatus;
  /** Timer action handlers */
  actions: TimerActions;
  /** Whether reset confirmation is showing */
  showResetConfirm: boolean;
  /** Handler to show reset confirmation */
  onResetRequest: () => void;
  /** Handler to confirm reset */
  onResetConfirm: () => void;
  /** Handler to cancel reset */
  onResetCancel: () => void;
}

/** Feedback toggle component props */
interface FeedbackToggleProps {
  /** Whether feedback is enabled */
  enabled: boolean;
  /** Handler for toggle change */
  onToggle: (enabled: boolean) => void;
}

// ============================================
// Hook Return Types
// ============================================

/** Return type for useTimer hook */
type UseTimerReturn = [TimerData, TimerActions];

/** Return type for useFeedback hook */
interface UseFeedbackReturn {
  /** Whether feedback is enabled */
  enabled: boolean;
  /** Toggle feedback on/off */
  toggle: () => void;
  /** Trigger feedback for phase transition */
  triggerTransition: (toPhaseType: PhaseType) => void;
  /** Trigger feedback for workout complete */
  triggerComplete: () => void;
}
```

### Phase Schedule Data Structure

```typescript
// app/lib/routine.ts

/** Duration constants in milliseconds */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

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

/** Phase type to color mapping */
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

/**
 * Calculate cumulative start times for each phase
 * Returns array where index i = start time of phase i in ms
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
 * Returns phase index (0-indexed), or -1 if workout complete
 */
export function findCurrentPhase(
  elapsedMs: number,
  routine: Routine
): number {
  const startTimes = calculatePhaseStartTimes(routine);

  for (let i = routine.phases.length - 1; i >= 0; i--) {
    if (elapsedMs >= startTimes[i]) {
      // Check if past the end of this phase
      const phaseEndMs = startTimes[i] + routine.phases[i].durationMs;
      if (elapsedMs >= phaseEndMs && i === routine.phases.length - 1) {
        return -1; // Workout complete
      }
      return i;
    }
  }

  return 0; // Default to first phase
}
```

### State Machine Specification

```
┌─────────────────────────────────────────────────────────────────┐
│                     TIMER STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

States: idle | running | paused | done

                    ┌──────────────────────────────┐
                    │                              │
                    ▼                              │
              ┌──────────┐                         │
     ┌───────►│   IDLE   │◄────────────────────────┤
     │        └────┬─────┘                         │
     │             │                               │
     │             │ start()                       │
     │             ▼                               │
     │        ┌──────────┐                         │
     │        │ RUNNING  │─────────────────────────┤
     │        └────┬─────┘                         │
     │             │                               │
     │             │ pause()          reset()      │
     │             ▼                               │
     │        ┌──────────┐                         │
     │        │  PAUSED  │─────────────────────────┤
     │        └────┬─────┘                         │
     │             │                               │
     │             │ resume()                      │
     │             │                               │
     │             └──────► RUNNING                │
     │                                             │
     │                      │                      │
     │                      │ (timer expires)      │
     │                      ▼                      │
     │                 ┌──────────┐                │
     └─────────────────│   DONE   │────────────────┘
         reset()       └──────────┘     reset()


TRANSITION TABLE:
┌─────────────┬──────────┬───────────┬────────────────────────────┐
│ From State  │ Action   │ To State  │ Side Effects               │
├─────────────┼──────────┼───────────┼────────────────────────────┤
│ idle        │ start()  │ running   │ Set startedAtMs = now()    │
│ idle        │ pause()  │ idle      │ (no-op)                    │
│ idle        │ resume() │ idle      │ (no-op)                    │
│ idle        │ reset()  │ idle      │ (no-op)                    │
├─────────────┼──────────┼───────────┼────────────────────────────┤
│ running     │ start()  │ running   │ (no-op)                    │
│ running     │ pause()  │ paused    │ Set pausedAtMs = now()     │
│ running     │ resume() │ running   │ (no-op)                    │
│ running     │ reset()  │ idle      │ Clear all timestamps       │
│ running     │ (expire) │ done      │ Trigger complete feedback  │
├─────────────┼──────────┼───────────┼────────────────────────────┤
│ paused      │ start()  │ paused    │ (no-op)                    │
│ paused      │ pause()  │ paused    │ (no-op)                    │
│ paused      │ resume() │ running   │ Add pause duration to total│
│ paused      │ reset()  │ idle      │ Clear all timestamps       │
├─────────────┼──────────┼───────────┼────────────────────────────┤
│ done        │ start()  │ done      │ (no-op)                    │
│ done        │ pause()  │ done      │ (no-op)                    │
│ done        │ resume() │ done      │ (no-op)                    │
│ done        │ reset()  │ idle      │ Clear all timestamps       │
└─────────────┴──────────┴───────────┴────────────────────────────┘

ELAPSED TIME CALCULATION:
  if (status === 'idle')    → elapsed = 0
  if (status === 'running') → elapsed = now() - startedAtMs - pausedTotalMs
  if (status === 'paused')  → elapsed = pausedAtMs - startedAtMs - pausedTotalMs
  if (status === 'done')    → elapsed = totalDurationMs
```

### Hook API Design

```typescript
// app/hooks/useTimer.ts

/**
 * useTimer Hook
 *
 * Core timer logic using absolute timestamps for accuracy.
 *
 * @param routine - The workout routine to use
 * @returns Tuple of [timerData, timerActions]
 *
 * @example
 * const [timer, actions] = useTimer(DEFAULT_ROUTINE);
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
 */
export function useTimer(routine: Routine): UseTimerReturn;

/**
 * Internal state shape
 */
const initialState: TimerState = {
  status: 'idle',
  startedAtMs: null,
  pausedAtMs: null,
  pausedTotalMs: 0,
};

/**
 * Hook implementation outline:
 *
 * 1. useState for TimerState
 * 2. useRef for animation frame ID
 * 3. useEffect for animation loop (when running)
 * 4. useMemo for computed values
 * 5. useCallback for stable action handlers
 *
 * Animation Loop:
 * - Use requestAnimationFrame for smooth updates
 * - Calculate elapsed on each frame
 * - Check for phase transitions
 * - Check for workout completion
 * - Trigger re-render via setState with current timestamp
 */
```

```typescript
// app/hooks/useFeedback.ts

/**
 * useFeedback Hook
 *
 * Manages audio and haptic feedback for phase transitions.
 *
 * @returns Feedback controls and trigger functions
 *
 * @example
 * const feedback = useFeedback();
 *
 * // Check/toggle enabled state
 * console.log(feedback.enabled); // true
 * feedback.toggle();
 *
 * // Trigger feedback (respects enabled state)
 * feedback.triggerTransition('hard');  // Triple beep + long vibration
 * feedback.triggerTransition('easy');  // Double beep + short vibration
 * feedback.triggerComplete();          // Success sound + pattern vibration
 */
export function useFeedback(): UseFeedbackReturn;

/**
 * Hook implementation outline:
 *
 * 1. useState for enabled (initialized from localStorage)
 * 2. useEffect to persist enabled to localStorage
 * 3. useRef for AudioContext (lazy initialization)
 * 4. useCallback for trigger functions
 *
 * Audio Implementation:
 * - Create AudioContext on first user interaction
 * - Use OscillatorNode for beeps
 * - Connect to GainNode for volume control
 *
 * Haptic Implementation:
 * - Check navigator.vibrate support
 * - Call with pattern array
 */
```

---

## Acceptance Criteria

### AC1: Countdown Display

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC1.1 | Display shows time in MM:SS format | Visual inspection |
| AC1.2 | Display updates at least every 200ms when running | DevTools performance monitor |
| AC1.3 | Display shows "10:00" when timer is idle | Visual inspection |
| AC1.4 | Display shows current phase remaining, not total remaining | Start timer, verify shows 10:00 for warmup |
| AC1.5 | Display is readable on 375px viewport from arm's length | Test on iPhone SE, check from ~2 feet |
| AC1.6 | Numbers don't cause layout shift during countdown | Watch for horizontal jumping as digits change |
| AC1.7 | Paused state is visually distinct from running | Visual inspection - should pulse or dim |

### AC2: Phase Tracking

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC2.1 | Current phase name is displayed | Visual inspection |
| AC2.2 | Phase label updates on transition | Let timer run through warmup→hard transition |
| AC2.3 | Hard phases show red color indicator | Visual inspection during hard phase |
| AC2.4 | Easy phases show green color indicator | Visual inspection during easy phase |
| AC2.5 | Warmup shows yellow/orange indicator | Visual inspection at start |
| AC2.6 | Cooldown shows blue indicator | Skip to cooldown phase and verify |
| AC2.7 | Phase counter shows correct "X of 10" | Verify at multiple phases |

### AC3: Timer Controls

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC3.1 | Start button visible when idle | Visual inspection |
| AC3.2 | Clicking Start transitions to running state | Click and verify timer counts down |
| AC3.3 | Pause button visible when running | Visual inspection while running |
| AC3.4 | Clicking Pause freezes the countdown | Click Pause, verify time doesn't change |
| AC3.5 | Resume button visible when paused | Visual inspection while paused |
| AC3.6 | Clicking Resume continues countdown | Click Resume, verify countdown resumes |
| AC3.7 | Reset shows confirmation when running | Click Reset while running, expect dialog |
| AC3.8 | Reset shows confirmation when paused | Click Reset while paused, expect dialog |
| AC3.9 | Reset immediately resets when idle | Click Reset when idle, verify no dialog |
| AC3.10 | Reset immediately resets when done | Complete workout, click Reset, verify no dialog |
| AC3.11 | Buttons have minimum 48x48px touch target | Inspect element dimensions |
| AC3.12 | Disabled buttons are visually distinct | Check when no valid actions available |

### AC4: Audio/Haptic Feedback

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC4.1 | Toggle switch visible on screen | Visual inspection |
| AC4.2 | Toggle state persists after page reload | Enable, reload, verify still enabled |
| AC4.3 | Audio plays on phase transition when enabled | Listen during transition |
| AC4.4 | No audio plays when toggle is disabled | Disable toggle, verify silence on transition |
| AC4.5 | Vibration triggers on supported devices | Test on phone with vibration |
| AC4.6 | Hard phase transition has distinct sound (triple beep) | Listen for pattern |
| AC4.7 | Easy phase transition has distinct sound (double beep) | Listen for pattern |
| AC4.8 | Workout complete has distinct sound | Complete workout and listen |

### AC5: Timer Accuracy

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC5.1 | Timer drift < 1 second over 10 minutes | Run timer with stopwatch, compare at 10:00 |
| AC5.2 | Pause/resume maintains accuracy | Pause 5x during workout, verify no accumulated drift |
| AC5.3 | Phase transitions occur at correct times | Verify Hard #1 starts at exactly 10:00 elapsed |
| AC5.4 | Total workout is exactly 43:00 | Run complete workout with stopwatch |
| AC5.5 | Timer continues accurately after tab background | Background tab for 1 minute, verify correct time on return |

### AC6: State Machine

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC6.1 | Cannot start when already running | Click Start twice, verify no effect |
| AC6.2 | Cannot pause when not running | Try to pause when idle, verify no effect |
| AC6.3 | Cannot resume when not paused | Try to resume when running, verify no effect |
| AC6.4 | Reset works from any state | Test reset from idle, running, paused, done |
| AC6.5 | Timer auto-transitions to done when complete | Let full workout run, verify done state |
| AC6.6 | Rapid clicking doesn't break state | Click Start/Pause rapidly, verify stable |

### AC7: Mobile Experience

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC7.1 | Layout works on 375px width | Test in DevTools mobile view |
| AC7.2 | No horizontal scrolling required | Verify on mobile viewport |
| AC7.3 | Touch targets are easily tappable | Test on actual phone |
| AC7.4 | Screen stays awake during workout | Verify no auto-sleep (may need Wake Lock API) |

---

## Appendix: File Structure

```
vo2-timer/
├── app/
│   ├── page.tsx                 # Main page, imports Timer
│   ├── layout.tsx               # Root layout with metadata
│   ├── globals.css              # Global styles
│   ├── components/
│   │   ├── Timer.tsx            # Main timer component
│   │   ├── TimerDisplay.tsx     # Countdown display
│   │   ├── TimerControls.tsx    # Start/Pause/Reset buttons
│   │   ├── PhaseIndicator.tsx   # Phase name and progress
│   │   └── FeedbackToggle.tsx   # Audio/haptic toggle
│   ├── hooks/
│   │   ├── useTimer.ts          # Core timer logic
│   │   └── useFeedback.ts       # Audio/haptic feedback
│   └── lib/
│       ├── routine.ts           # Phase definitions
│       └── format.ts            # Time formatting utilities
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # App icons
├── SPEC.md                      # This file
├── TASKS.md                     # Task tracking
└── DECISIONS.md                 # Architecture decisions
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | Architect | Initial specification |
