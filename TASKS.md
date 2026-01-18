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
- [ ] Create `app/lib/routine.ts` - Phase definitions
- [ ] Create `app/hooks/useTimer.ts` - Timer logic hook
- [ ] Implement absolute timestamp timing
- [ ] Implement pause/resume logic
- [ ] Implement phase transition logic

### UI Components
- [ ] Create `app/components/Timer.tsx`
- [ ] Big countdown display (mm:ss)
- [ ] Phase label display
- [ ] Control buttons (Start/Pause/Resume/Reset)
- [ ] Beep/vibration toggle
- [ ] Mobile-first styling

### PWA Setup
- [ ] Create `public/manifest.json`
- [ ] Add iOS meta tags to layout.tsx
- [ ] Add app icons

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
