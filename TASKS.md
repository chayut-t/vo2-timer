# Tasks

## Legend
- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Complete
- `[!]` - Blocked

---

## 📐 Specification (Architect)

- [x] Write detailed SPEC.md
  - [x] Feature descriptions (F1-F4)
  - [x] Component interfaces (TypeScript)
  - [x] State machine specification
  - [x] Acceptance criteria (AC1-AC7)
- [x] Document decisions in DECISIONS.md
- [x] Define phase schedule data structure

---

## 🔨 Build (Builder)

### Core Timer Engine
- [x] Create `app/lib/routine.ts` - Phase definitions
- [x] Create `app/hooks/useTimer.ts` - Timer logic hook
- [x] Implement absolute timestamp timing
- [x] Implement pause/resume logic
- [x] Implement phase transition logic

### UI Components
- [x] Create `app/components/Timer.tsx`
- [x] Big countdown display (mm:ss)
- [x] Phase label display
- [x] Control buttons (Start/Pause/Resume/Reset)
- [x] Beep/vibration toggle
- [x] Mobile-first styling

### PWA Setup
- [x] Create `public/manifest.json`
- [x] Add iOS meta tags to layout.tsx
- [x] Add app icons (placeholders)

---

## 🧪 Test (QA)

### Functional Tests
- [x] Timer accuracy over full routine (absolute timestamps - no drift)
- [x] Pause/resume accuracy (correct calculation)
- [x] Phase transitions timing (boundaries correct)
- [x] State machine transitions (all 16 cases verified)

### UI Tests
- [ ] Mobile viewport (375px) - needs manual test
- [x] Button state correctness (code review passed)
- [x] Display updates (requestAnimationFrame loop)

### Edge Cases
- [x] Rapid button clicking (guards prevent issues)
- [x] Tab backgrounding (timestamps handle correctly)
- [x] Page refresh handling (state lost - expected behavior)

---

## 🐛 Bugs Found

### High Priority
- [x] **BUG-001**: No audio/haptic feedback on workout START
  - Location: `Timer.tsx:140-147`
  - SPEC says single beep + short pulse on start
  - FIXED: Added effect to detect idle→running transition

### Medium Priority
- [x] **BUG-002**: AudioContext may be suspended on mobile
  - Location: `Timer.tsx:47-77`
  - FIXED: Added `ctx.resume()` check before playing audio
  - Made `playBeep` async to handle resume promise

- [x] **BUG-003**: Screen may sleep during workout (AC7.4)
  - Wake Lock API implemented in `Timer.tsx:167-211`
  - Acquires lock when running, releases on pause/done/reset
  - Re-acquires on tab visibility change

### Low Priority
- [x] **BUG-004**: useFeedback returns non-memoized object
  - Location: `Timer.tsx:132-135`
  - FIXED: Wrapped return in `useMemo` with proper dependencies
  - Prevents unnecessary effect re-runs

---

## 🚀 Deploy

- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Deploy production build
- [ ] Test on iPhone Safari
- [ ] Add to Home Screen test
