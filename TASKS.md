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
- [ ] Timer accuracy over full routine
- [ ] Pause/resume accuracy
- [ ] Phase transitions timing
- [ ] State machine transitions

### UI Tests
- [ ] Mobile viewport (375px)
- [ ] Button state correctness
- [ ] Display updates

### Edge Cases
- [ ] Rapid button clicking
- [ ] Tab backgrounding
- [ ] Page refresh handling

---

## 🚀 Deploy

- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Deploy production build
- [ ] Test on iPhone Safari
- [ ] Add to Home Screen test
