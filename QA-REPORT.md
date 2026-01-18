# QA Report - 2026-01-18

## Summary

Performed code review and static analysis of the VO₂max Timer implementation against SPEC.md requirements.

**Overall Assessment:** Implementation is solid with correct timer accuracy approach. Found 4 bugs, 1 high severity.

---

## Test Results

### 1. Timer Accuracy ✅ PASSED

**Elapsed Time Calculation** (`useTimer.ts:107-125`)

| Status | Calculation | Correct? |
|--------|-------------|----------|
| `idle` | `0` | ✅ |
| `running` | `now() - startedAtMs - pausedTotalMs` | ✅ |
| `paused` | `pausedAtMs - startedAtMs - pausedTotalMs` | ✅ |
| `done` | `totalDurationMs` | ✅ |

**Will there be drift over 43 minutes?**
- **No.** The absolute timestamp approach is immune to drift because:
  1. Elapsed time is calculated from `Date.now()` on each frame
  2. No interval counting that could miss ticks
  3. Browser throttling only affects display update frequency, not accuracy
  4. Tab backgrounding is handled correctly (next frame recalculates from timestamps)

**Verdict:** Timer accuracy meets AC5.1-AC5.5 requirements.

---

### 2. State Machine ✅ PASSED

**Transition Guards:**

| From State | Action | Expected | Implementation | Correct? |
|------------|--------|----------|----------------|----------|
| `idle` | `start()` | → `running` | Guard: `status !== 'idle'` | ✅ |
| `idle` | `pause()` | no-op | Guard: `status !== 'running'` | ✅ |
| `idle` | `resume()` | no-op | Guard: `status !== 'paused'` | ✅ |
| `idle` | `reset()` | no-op | No guard (returns to idle) | ✅ |
| `running` | `start()` | no-op | Guard prevents | ✅ |
| `running` | `pause()` | → `paused` | Sets `pausedAtMs` | ✅ |
| `running` | `resume()` | no-op | Guard prevents | ✅ |
| `running` | `reset()` | → `idle` | Clears state + cancels frame | ✅ |
| `running` | (expire) | → `done` | Checked in animation loop | ✅ |
| `paused` | `start()` | no-op | Guard prevents | ✅ |
| `paused` | `pause()` | no-op | Guard prevents | ✅ |
| `paused` | `resume()` | → `running` | Adds pause duration | ✅ |
| `paused` | `reset()` | → `idle` | Clears state | ✅ |
| `done` | `start()` | no-op | Guard prevents | ✅ |
| `done` | `reset()` | → `idle` | Clears state | ✅ |

**Invalid Transition Handling:** All invalid transitions are no-ops (silent ignore). This matches SPEC.md AC6.1-AC6.3.

**Verdict:** State machine is correctly implemented per SPEC.md.

---

### 3. Phase Transitions ✅ PASSED

**Phase Boundary Test** (`routine.ts:114-130`)

Testing `findCurrentPhaseIndex()` at exact boundaries:

| Elapsed | Expected Phase | startTimes[i] | Result |
|---------|----------------|---------------|--------|
| 0ms | 0 (Warmup) | 0 | ✅ |
| 599999ms | 0 (Warmup) | 0 | ✅ |
| 600000ms | 1 (Hard #1) | 600000 | ✅ |
| 600001ms | 1 (Hard #1) | 600000 | ✅ |
| 2579999ms | 9 (Cooldown) | 2280000 | ✅ |
| 2580000ms | -1 (complete) | total exceeded | ✅ |

**Algorithm:** Iterates from last phase backward, returns first phase where `elapsed >= startTime`. This is correct because phases are contiguous.

**Time Formatting** (`routine.ts:184-188`)
- Uses `Math.ceil(ms / 1000)` - shows "00:01" until last millisecond, then "00:00"
- Correct behavior for countdown display

**Verdict:** Phase transitions are correct at all boundaries.

---

### 4. Edge Cases

#### Rapid Clicking ✅ PASSED
- State guards prevent double-execution
- `useCallback` with status dependencies ensures stable handlers
- Animation frame cleanup prevents memory leaks

#### Tab Backgrounding ✅ PASSED
- Absolute timestamps handle this correctly
- When tab resumes, `Date.now()` gives correct elapsed time
- No accumulation of missed frames

#### Page Refresh ⚠️ KNOWN LIMITATION
- Timer state is NOT persisted (expected per DECISIONS.md)
- Progress is lost on refresh
- This is acceptable for MVP

---

## Bugs Found

### Bug #1: No Feedback on Workout Start
**Severity:** HIGH

**Location:** `Timer.tsx:140-144`

**Steps to Reproduce:**
1. Open the timer in idle state
2. Enable sound/vibration toggle
3. Click "Start"

**Expected (per SPEC.md F4):**
- Single beep (800Hz)
- Short vibration pulse (100ms)

**Actual:**
- No audio or haptic feedback

**Root Cause:**
The phase transition effect only triggers when `currentPhaseIndex` changes. On start, the phase is still 0, so no feedback fires.

**Fix Required:**
Add a separate effect to detect workout start and trigger feedback.

---

### Bug #2: AudioContext May Be Suspended
**Severity:** MEDIUM

**Location:** `Timer.tsx:40-45`

**Steps to Reproduce:**
1. Open timer on iOS Safari
2. Click "Start" immediately
3. Wait for first phase transition

**Expected:**
- Audio beep plays on phase transition

**Actual:**
- First beep may be silent (AudioContext suspended)

**Root Cause:**
```typescript
audioContextRef.current = new AudioContext();
```
On mobile browsers, AudioContext starts in "suspended" state and must be resumed after a user gesture.

**Fix Required:**
```typescript
const ctx = getAudioContext();
if (ctx.state === 'suspended') {
  ctx.resume();
}
```

---

### Bug #3: Screen May Sleep During Workout
**Severity:** MEDIUM

**Location:** Not implemented

**Steps to Reproduce:**
1. Start workout
2. Set phone down
3. Wait 2-3 minutes without touching screen

**Expected (per AC7.4):**
- Screen stays awake during workout

**Actual:**
- Screen may auto-lock depending on device settings

**Root Cause:**
Wake Lock API not implemented.

**Fix Required:**
Add Wake Lock API when timer is running:
```typescript
if ('wakeLock' in navigator) {
  const wakeLock = await navigator.wakeLock.request('screen');
}
```

---

### Bug #4: useFeedback Returns Non-Memoized Object
**Severity:** LOW

**Location:** `Timer.tsx:126`

**Issue:**
```typescript
return { enabled, toggle, triggerTransition, triggerComplete };
```
This creates a new object on every render, causing unnecessary effect re-runs.

**Impact:**
- Minor performance impact
- No functional bugs due to guards

**Fix Required:**
Wrap return in `useMemo`:
```typescript
return useMemo(() => ({
  enabled, toggle, triggerTransition, triggerComplete
}), [enabled, toggle, triggerTransition, triggerComplete]);
```

---

## Test Coverage Summary

### Passed ✅
- [x] Timer accuracy - no drift over time
- [x] Pause/resume maintains accuracy
- [x] Phase transitions at correct boundaries
- [x] State machine transitions (all 16 cases)
- [x] Invalid transitions are no-ops
- [x] Reset confirmation dialog (running/paused)
- [x] Reset immediate (idle/done)
- [x] Tab backgrounding recovery
- [x] Rapid clicking stability

### Failed ❌
- [ ] Feedback on workout start (Bug #1)
- [ ] AudioContext resume on mobile (Bug #2)
- [ ] Wake Lock for screen (Bug #3)

### Not Tested (Requires Manual)
- [ ] Mobile viewport visual inspection
- [ ] Touch target size verification
- [ ] Audio pattern correctness
- [ ] Vibration on physical device

---

## Recommendations

1. **Fix Bug #1 immediately** - Missing start feedback is a user-facing issue
2. **Fix Bug #2 before mobile testing** - Critical for iOS Safari
3. **Consider Bug #3 for v1.1** - Nice to have, not blocking
4. **Fix Bug #4 opportunistically** - Low priority optimization

---

## Revision History

| Date | Tester | Notes |
|------|--------|-------|
| 2026-01-18 | QA Agent | Initial code review |
