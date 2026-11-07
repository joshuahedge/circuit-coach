# Strength & Running Coach Implementation Plan

> **For agentic workers:** executed inline in the session that wrote it (owner said "go straight to build").
> Steps use checkbox (`- [ ]`) syntax. The plan lists files, interfaces and tests per task rather than full code,
> because the author is the implementer; every task still runs test-first and ends with a commit.

**Goal:** An installable, offline iPhone web app that logs bodyweight strength sessions, runs, check-ins and
benchmarks, shows progress, and suggests explainable plan changes the owner approves.

**Architecture:** Plain ES modules with no build step. Pure logic modules (`src/*.js`) take state and return
values; the UI (`src/ui/*.js`) renders views from state through one small app controller that saves to
`localStorage` after each change. A service worker caches the file list for offline use.

**Tech Stack:** HTML, CSS, JavaScript modules; in-browser test harness run by headless Edge
(`tests/run-tests.ps1`, Python static server); Pillow for icons.

**Spec:** `docs/superpowers/specs/2026-11-07-strength-run-coach-design.md`

## Global Constraints

- No Node, no build step, no third-party runtime libraries; everything works offline.
- Never programme burpees or mountain climbers (library has no such exercise; swaps exclude them; a test checks).
- No body measurements, employer name or private brief in the repo.
- Inputs at least 16 px text; tap targets at least 44 px; safe-area padding; light and dark themes.
- Every plan change goes through a suggestion or an explicit edit, and creates a new plan version.
- Dates are local calendar dates `YYYY-MM-DD`; weeks start Monday.
- Commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

```
index.html, manifest.webmanifest, sw.js, sw-files.js (generated), .nojekyll, README.md
css/app.css
icons/ (icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon-32.png)
src/dates.js      local-date helpers
src/pace.js       duration and pace parse/format
src/library.js    exercise library: how-to, cues, ladders, swaps, levers, caps
src/plan.js       default sessions, prescription labels, apply change, duration estimate, revert
src/store.js      empty state, load/save with fallback, migrate, backup make/read, ids
src/schedule.js   strength-day recommender, block week and phase, run protection, week model
src/coach.js      suggestion and note rules, accept, reject
src/stats.js      chart series
src/summary.js    text summary for Claude
src/app.js        controller: state, update, router, render, toasts
src/main.js       boot (real storage, service worker)
src/ui/dom.js     h(), formatting bits, sheet and toast helpers
src/ui/chart.js   SVG line and bar charts
src/ui/setup.js, week.js, log.js, logStrength.js, logRun.js, checkin.js, benchmark.js,
       progress.js, coach.js, plan.js, settings.js, pwa.js
tests/harness.js, index.html, serve.py, run-tests.ps1, all.js, *.test.js
tools/sw-files.ps1, tools/icons.py
```

## Interfaces (shared names)

- `dates.js`: `todayISO(now?)`, `addDays(iso, n)`, `daysBetween(a, b)`, `weekStart(iso)`, `weekDays(iso)`,
  `dayKey(iso)`, `DAY_KEYS`, `DAY_NAMES`, `formatShort(iso)`, `formatDay(iso)`.
- `pace.js`: `parseDuration(text) → sec|null`, `formatDuration(sec)`, `paceSecPerKm(km, sec)`, `formatPace(secPerKm)`.
- `library.js`: `EXERCISES[id]` = `{ id, name, unit, sides, legHeavy, cap, levers, ladder, howTo, cues, swaps }`,
  `WARMUPS`, `COOLDOWN`, `LIMITATION_NOTE`, `isBannedName(name)`.
- `plan.js`: `defaultSessions(today)`, `createInitialPlan(today)`, `currentPlan(state)`, `prescriptionLabel(p)`,
  `sideCount(p)`, `estimateMinutes(session)`, `withPrescription(plan, sessionId, exerciseId, p, { today, reason })`,
  `revertPlan(state, version, today)`, `sessionForToday(session, { runProtect })`.
- Prescription: `{ exerciseId, variation, sets, min, max, unit, sides, tempoDown, pause, cue, legHeavy,
  runProtectSets, maxSets, since }`.
- `store.js`: `STORAGE_KEY`, `PREV_KEY`, `emptyState(now)`, `loadState(storage)`, `saveState(storage, state)`,
  `migrate(raw)`, `makeBackup(state, now)`, `readBackup(text)`, `newId(prefix)`, `memoryStorage()`.
- `schedule.js`: `recommendStrengthDays(runDays)`, `blockInfo(state, today)`, `runProtection(state, iso)`,
  `weekModel(state, today)`, `scheduleWarnings(schedule)`.
- `coach.js`: `coachReview(state, today) → { suggestions, notes }`, `acceptSuggestion(state, s, today, editedTo?)`,
  `rejectSuggestion(state, s, today)`.
- `stats.js`: `exerciseSeries`, `runPaceSeries`, `weeklyTotals`, `effortSeries`, `benchmarkSeries`.
- `summary.js`: `buildSummary(state, today)`.
- `app.js`: `createApp({ root, storage, now, sw })` → `{ state, update(fn, toastText?), go(route), render() }`.

## Tasks

### Task 1: Scaffold, test harness, dates, pace
- [ ] Copy the proven harness (`harness.js`, `index.html`, `serve.py`, `run-tests.ps1`) adapted to this app.
- [ ] Tests: date arithmetic across month ends and DST, Monday week start, day keys; duration parsing
      (`65`, `65:30`, `1:05:30`, junk), pace maths and formatting.
- [ ] Implement `dates.js`, `pace.js`; run; commit.

### Task 2: Exercise library and plan
- [ ] Tests: every plan exercise exists in the library; no banned names anywhere (names, ladders, swaps);
      default sessions match the spec table; `prescriptionLabel` ("3 × 8–10 per leg", "2 × 25–40 s per side",
      "2 × 6–8 each position"); `estimateMinutes` within 30–40 for both sessions; `withPrescription` makes
      version n+1 with `since`, leaves the old version untouched; `revertPlan` copies an old version;
      `sessionForToday` applies `runProtectSets`.
- [ ] Implement; run; commit.

### Task 3: Storage and backup
- [ ] Tests: empty state shape; save then load round-trips; save keeps the previous copy; corrupt main falls
      back to previous; both corrupt reports `failed`; migrate fills missing arrays; backup filename and
      payload; `readBackup` rejects other apps, newer schema and bad JSON, and summarises counts.
- [ ] Implement; run; commit.

### Task 4: Scheduling and block phase
- [ ] Tests: long run Saturday → Tue A, Thu B; long run Monday avoids Sunday; consecutive days avoided;
      reasons mention the long run; `runProtection` true 1–2 days before the long run only; quality-run cue
      the day before; `blockInfo` weeks and phases incl. review after week 8; `weekModel` ticks planned runs
      and sessions done that week, km total, next up; `scheduleWarnings` for strength the day before long or
      quality runs and consecutive strength days.
- [ ] Implement; run; commit.

### Task 5: Coach rules
- [ ] Tests (one per rule): no progress in weeks 1–2; build adds 1 (2 with RIR ≥ 3); seconds +5; cap switches
      to a lever; intensify lever order and caps; extra set blocked by time; consolidate +1 only; RPE fallback
      when RIR missing; pain blocks and suggests easier variation; leg soreness and affected-run block leg
      exercises; low check-ins block all; missed reps lowers range; high effort drops a set; affected run drops a
      leg set; notes (0 RIR hold, rising run effort, low recovery, km jump, benchmark due); limits (one per
      exercise, two per session, holding back first); decided keys hidden; new evidence makes a new key;
      accept creates a plan version and decision; edit uses edited values; reject only records a decision;
      only logs since `since` count.
- [ ] Implement; run; commit.

### Task 6: Stats and summary
- [ ] Tests: exercise series per date (average per set, per side averaged), pace by type, weekly totals over
      8 weeks with zeros, effort series, benchmark series; summary contains plan, recent logs, suggestions.
- [ ] Implement; run; commit.

### Task 7: App shell and setup
- [ ] `index.html`, `css/app.css` (tokens, light and dark, safe areas), `dom.js`, `app.js` router and tab bar,
      `main.js`, setup wizard.
- [ ] UI test: fresh app shows setup; completing setup saves schedule, conventions, plan v1 and baseline
      benchmark, then shows Week.
- [ ] Commit.

### Task 8: Week screen
- [ ] Calendar, block banner, next up, totals, warnings, check-in prompt, suggestion count, backup reminder,
      install hint in a Safari tab.
- [ ] UI test: sample state shows ticks, km and next up. Commit.

### Task 9: Logging
- [ ] Strength logger (draft saved per tap, steppers, sides, RIR, skip/modify, pain, effort, energy, duration,
      wake lock, run-protection switch), run log (live pace), check-in, benchmark.
- [ ] UI tests: full strength log saves a log and clears the draft; run log saves pace inputs; check-in saves.
- [ ] Commit.

### Task 10: Progress
- [ ] `chart.js` (line with points, bars), progress view with exercise picker, pace by type, weekly km,
      consistency, effort, benchmarks. Empty states.
- [ ] UI test: renders with sample data and with none. Commit.

### Task 11: Coach, Plan and settings
- [ ] Coach view (suggestions with Accept, Edit sheet, Reject; notes; block review; history and revert;
      copy summary). Plan view (sessions, how-to, swaps, edit prescription, schedule). Settings (profile,
      backup, restore with confirm, reset with confirm).
- [ ] UI tests: accept changes the plan version; reject hides it; edit saves a version; restore replaces state.
- [ ] Commit.

### Task 12: Install and offline
- [ ] Manifest, icons (`tools/icons.py`), iOS meta, `sw.js`, `tools/sw-files.ps1`, update toast, test that
      every cached file exists and the stamp is current.
- [ ] Commit.

### Task 13: Visual check, review, README
- [ ] Serve locally, check every screen at 375 × 812 light and dark in the browser pane, fix issues.
- [ ] Independent code review of the whole app; fix findings.
- [ ] README with install steps for iPhone and the owner's device checks. Commit.
