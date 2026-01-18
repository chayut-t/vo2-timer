# Decisions Log

This document records architectural and design decisions for the VO₂max Timer project.

---

## Decision 1: Timer Implementation Approach

**Status:** ✅ Final

**Decision:** Use absolute timestamps instead of interval-based counting.

**Implementation:**
```typescript
interface TimerState {
  status: 'idle' | 'running' | 'paused' | 'done';
  startedAtMs: number | null;
  pausedAtMs: number | null;
  pausedTotalMs: number;
}

// Elapsed calculation
const elapsed = Date.now() - startedAtMs - pausedTotalMs;
```

**Rationale:**
- `setInterval` drift accumulates over time
- Browser throttling in background tabs causes missed ticks
- Pause/resume with intervals requires complex bookkeeping
- Absolute timestamps are immune to these issues

**Alternatives Considered:**
- ❌ `setInterval` with drift correction - Complex and still imperfect
- ❌ Web Workers - Overkill for this use case
- ✅ Absolute timestamps - Simple, reliable, accurate

---

## Decision 2: Default Routine Structure

**Status:** ✅ Final

**Decision:** Use the following routine:

| Phase | Duration |
|-------|----------|
| Warmup | 10:00 |
| Hard #1 | 4:00 |
| Easy #1 | 3:00 |
| Hard #2 | 4:00 |
| Easy #2 | 3:00 |
| Hard #3 | 4:00 |
| Easy #3 | 3:00 |
| Hard #4 | 4:00 |
| Easy #4 | 3:00 |
| Cooldown | 5:00 |
| **Total** | **43:00** |

**Rationale:**
- Standard 4x4 VO₂max protocol
- 4-minute hard intervals at 90-95% max HR
- 3-minute active recovery
- Adequate warmup and cooldown

---

## Decision 3: Technology Stack

**Status:** ✅ Final

**Decision:**
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Package Manager: Bun
- Hosting: Vercel

**Rationale:**
- Next.js App Router is the modern standard
- TypeScript catches errors early
- Tailwind enables rapid mobile-first development
- Bun is faster than npm
- Vercel has seamless Next.js integration

---

## Decision 4: PWA Approach

**Status:** ✅ Final

**Decision:** Minimal PWA - just enough for "Add to Home Screen"

**Implementation:**
- Add `manifest.json` with app metadata
- Add appropriate meta tags for iOS
- NO service worker (keeps it simple)

**Rationale:**
- Full offline support not needed (timer is stateless)
- Avoiding service worker complexity
- iOS Safari has limited PWA support anyway

---

## Decision 5: State Machine Design

**Status:** ✅ Final

**Decision:** Four states with defined transitions:
┌───────┐
│ idle  │ ←──────────────────────┐
└───┬───┘                        │
│ start()                    │ reset()
▼                            │
┌───────┐  pause()  ┌────────┐   │
│running│ ────────► │ paused │ ──┤
└───┬───┘           └───┬────┘   │
│ ◄─────────────────┘        │
│    resume()                │
│                            │
│ (timer completes)          │
▼                            │
┌───────┐                        │
│ done  │ ───────────────────────┘
└───────┘

**Rationale:**
- Simple, predictable state machine
- Clear allowed transitions
- Easy to test and reason about
