# Strength & Running Coach: design

> **Revision, 7 Nov 2026 (later the same day): running removed. The app is now "Circuit Coach".** The owner
> asked to drop running and focus on the circuit sessions. Everything below about run days, run types, run
> logging, run protection (lighter Session B before a long run), the 10K benchmark, pace and km charts, and
> the run-based coach rules (sore legs affected a run, runs feeling harder, weekly km jumps) no longer
> applies. What replaced it:
> - Schedule: two training days chosen at setup (default Tuesday A, Friday B); the only schedule warning is
>   back-to-back days. Sessions always run as circuits (no "one exercise at a time" option).
> - Coach: leg increases pause only on check-in leg soreness of 4 or more; all other rules unchanged.
> - Week: sessions this week and sessions this block. Progress: consistency, exercises, effort, benchmarks.
> - Each exercise's How to shows an openly licensed picture (stored in the app, credited on screen and in
>   `assets/exercises/CREDITS.md`).
> - Storage keeps the same keys and backup format; old run data in a backup is ignored.
> - Block review (added the same evening, owner chose "only what needs it"): after week 8 the coach's note and a
>   Week card open a review screen (src/blockReview.js, src/ui/blockReview.js). It shows sessions done vs planned,
>   average effort, each exercise's first and last average, step-ups and pain flags, and benchmarks start vs
>   latest. Proposals, each switchable, at most two per session, one per exercise, by priority: repeated pain
>   (2+ flags) → swap to the exercise's first alternative; session average over 42 min → one set fewer on the
>   biggest exercise; stalled (4+ workouts, no step-up, no pain) → 1 s slower lowering and range −2 (holds: next
>   version); session average under 30 min with every session done → one more set where it fits 40 min. Under
>   75 % of planned sessions done → no changes, a note to repeat the plan. Starting applies the kept changes as
>   one plan version ("Block N plan: …") and starts the block (Undo in the toast).
> - Refinements (7 Nov, evening; the owner picked these from a list and declined a mobility routine, spoken
>   cues and monthly measurements): every harder version and swap has its own how-to steps and cues
>   (src/routines.js, `howToFor`), with its own picture where an openly licensed one exists, otherwise the base
>   exercise's picture labelled as such; the Coach screen lists where each exercise stands (`exerciseStanding`
>   in src/coach.js: 0 of 2 / 1 of 2 clean sessions, ready but waiting for week 3 / the review / its turn, or
>   on hold for pain, soreness or low recovery, or a suggestion to answer); the warm-up is guided move by move
>   (6 moves, 5 min, per session) and a guided 4-minute cool-down is offered when every set is done
>   (src/guide.js, timestamp-based so a locked phone catches up); a new icon (a ring of five stations with a
>   rising chevron) replaces the old one with the running dot.
> - 1.2 (11 Nov 2026, owner approved in chat): circuit editor (`#/plan/edit/<session>`, src/ui/circuitEditor.js,
>   src/circuit.js): add, remove, reorder, change numbers, per-session time target 40/50/60 (`targetMin`, used by
>   the coach's extra-set rule and the block review's long/short rules instead of a fixed 40); Save = one plan
>   version (`withSession`) with Undo. 25 more built-in exercises (src/moreExercises.js; every exercise now has
>   `area`, `focus`, `note`, `start`). Your own exercises (`state.customExercises`, registered via
>   `useExercises`; the coach adds reps or 5 s up to a cap, then a set). A balance check flags a session with no
>   legs, push, upper-back or core exercise and offers two built-in ones.
> - 1.3 (11 Nov 2026, owner's picks): sessions are no longer fixed at A and B (`sessionIds`). Block review adds
>   one fresh exercise per session outside the two-fixes cap (fewest step-ups, done 2+ times; same focus, then
>   area; never-had first) and, from block 2 when 90 % of planned sessions over the last two blocks were done,
>   an optional Session C (off by default; one exercise per area not in A/B, 2 sets, 30-min target, the free day
>   furthest from the others; removable in Plan). Coach notes: easy week (last 3 sessions' effort >= 8 and 1+
>   above the 3 before, with short reps in 2 of 3; or 4+ low check-ins in 14 days) = one set fewer for 2
>   sessions, no step-ups, easy logs never count as evidence; shorter rests (an exercise ready but with no step
>   left) = 15 s off each rest, floors 30 s / 60 s. Five more pictures (glute bridge, decline press-up, front
>   plank, bird dog, reverse plank).

Approved in chat on 7 Nov 2026. Source: a private training brief (kept out of this public repo). This spec
records what the app must do and the decisions made with the owner. Personal body measurements are never
written into the code or this repo: the owner enters them on the phone.

## 1. What it is

A personal web app, installed on an iPhone from Safari (Share, then Add to Home Screen), for tracking two
weekly bodyweight strength sessions alongside three weekly runs. It logs workouts, runs and recovery, shows
progress, and suggests plan changes with reasons the owner accepts, edits or rejects.

- Hosting: public repo `joshuahedge/circuit-coach` (named after the renamed app; first planned as
  `strength-run-coach`), GitHub Pages from `main` at `/`, live at
  `https://joshuahedge.github.io/circuit-coach/`. Creating the repo and every push needs the owner's go.
- No build step, no Node: plain HTML, CSS and JavaScript modules, like the owner's other personal project.
- Works offline after the first visit (service worker caches every app file).
- All data lives on the phone (browser storage of the installed app). Backup and restore through a JSON file.
- The repo never names the owner's employer.

## 2. Training rules the app enforces (from the brief)

- Bodyweight only, exercise mat, small living-room space. No door or towel anchors, no furniture-based
  variations by default.
- Never programme burpees or mountain climbers.
- Strength sessions take 35–40 minutes including a 5-minute warm-up and a 4–5-minute cool-down.
- Leave 1–3 reps in reserve (RIR) on most sets; no grinding or technical failure.
- Strength must support running: protect the long run and the quality run.
- Change one thing at a time. Never increase load just because a calendar week has passed.
- Never silently change the plan: every change is shown with its reason and evidence and needs the owner's
  accept (or edit). Plan versions are kept and can be reverted.
- Training advice is general fitness guidance, not medical care. Sharp, worsening or unusual pain means stop
  the exercise and seek professional advice; the app says so wherever pain is reported.
- No weight-loss or calorie targets.
- Bodyweight training has limits for pulling and back strength; the app says so in the exercise library
  rather than inventing unsafe anchors.

## 3. Starting plan (plan version 1)

Session A (unilateral strength, push, trunk stability). Warm-up: march or gentle jog on the spot, bodyweight
squats, alternating reverse lunges, glute bridges, arm circles, bird dogs.

| Exercise | Start | Range | Cues |
|---|---|---|---|
| Reverse lunge | 3 sets | 8–10 per leg | 2–3 s lowering; stable foot; comfortable range |
| Press-up | 3 sets | 8–12 | about 2 s down; body in one line; stop before form breaks |
| Single-leg glute bridge | 2 sets | 5–6 per leg | 2 s pause at the top; pelvis level |
| Prone Y–T–W raises | 2 sets | 6–8 in each position | slow, small, no momentum |
| Dead bug | 3 sets | 8–10 per side | lower back controlled; exhale as arm and leg extend |

Session B (tempo legs, shoulders, calves, lateral core). Warm-up: hip hinges, leg swings, calf raises,
alternating lunges, bird dogs, shoulder circles.

| Exercise | Start | Range | Cues |
|---|---|---|---|
| Single-leg Romanian deadlift | 3 sets | 8 per leg | hinge at hip; square hips; 3 s lowering; fingertip support if balance limits control |
| Tempo squat | 3 sets | 10–12 | 3 s down, 1–2 s pause, smooth up |
| Pike push-up | 2 sets | 6–8 | scale range or stand more upright; stop on shoulder discomfort |
| Single-leg calf raise | 3 sets | 10–12 per leg | 2 s up, 3 s down, pause at the top |
| Side plank | 2 sets | 25–40 s per side | hips lifted; progress quality, not just time |

Cool-down (both): hip-flexor stretch, calf stretch, 90/90 hip rotations, thoracic rotations.

Rest: 30–60 s between exercises, 60–90 s between rounds.

Run protection (from the brief): when a session falls within 48 hours before the long run, single-leg RDL
and calf raises drop to 2 sets and no leg set goes close to failure. Before a quality run, lower-body work
stays moderate.

Each prescription holds: exercise id, variation name, sets, min and max reps (or seconds), unit, sides
(none, left/right, or Y/T/W), tempo note, pause seconds, cue, `legHeavy`, optional `runProtectSets`,
`maxSets`, and `since` (the date the prescription last changed).

## 4. Data (one saved document, schemaVersion 1)

```
state = {
  schemaVersion: 1, createdAt, setupDone,
  profile: { age, heightCm, weightKg, level, goals[], equipment[], disliked[], sessionMinutes: [35, 40] },
  conventions: { lungeBaselinePerLeg, bridgeBaselinePerLeg },
  schedule: { runDays: { mon, wed, sat: 'easy'|'quality'|'long'|'other' }, strengthDays: { tue: 'A', thu: 'B' } },
  block: { number, startDate },
  plans: [ { version, effectiveFrom, reason, acceptedByUser, createdAt, sessions: { A, B } } ],
  strengthLogs: [ { id, date, sessionId, planVersion, durationMin, runProtect, exercises: [
      { exerciseId, variation, status: 'done'|'skipped'|'modified', reason, pain,
        sets: [ { side, reps | seconds, rir } ] } ], rpe, energyBefore, pain, notes } ],
  runLogs: [ { id, date, distanceKm, durationSec, runType, rpe, sorenessAffected, notes } ],
  checkins: [ { id, date, energy, legSoreness, sleep, pain } ],
  benchmarks: [ { id, date, pressUps, plankSec, bridgeLeft, bridgeRight, squats, lunges, tenKSec, notes } ],
  decisions: [ { key, status: 'accepted'|'edited'|'rejected', at, planVersion } ],
  draft: null | in-progress strength log,
  settings: { lastBackupAt }
}
```

Scales: energy, sleep 1–5 (5 best); leg soreness 0–5 (0 none); effort (RPE) 1–10; RIR 0–5.

Storage: `localStorage` key `src-state`, with the previous good copy under `src-state-prev` (dropped first if
storage is full). A load that fails to parse, or a set-up state with no plan, falls back to the previous copy,
then to a recovery screen that offers restore from file. Restore and erase first keep the old data under
`src-state-replaced` and offer Undo. The app
asks for persistent storage (`navigator.storage.persist`). The in-progress strength log (`draft`) is saved on
every tap so an app reload mid-workout loses nothing.

## 5. Screens

Bottom tab bar: Week, Log, Progress, Coach, Plan. Hash routes (`#/week`, `#/log/strength/A`, ...).

1. **Setup (first run).** Run type for Monday, Wednesday and Saturday; whether the baseline 10 lunges and
   5 glute bridges were per leg; optional age, height, weight; then a recommended pair of strength days with
   reasons, which the owner confirms or changes. Times are typed as separate minutes and seconds (the iPhone number
pad has no colon). Baselines (press-ups 20, squats 20, lunges 10, plank 60 s,
   single-leg bridge 5, 10K about 65 min) are pre-filled as the first benchmark entry and editable.
2. **Week (home).** Monday-to-Sunday calendar of planned runs and strength sessions with done ticks, the
   block week and phase, a Next up card, this week's km and sessions, schedule warnings, a check-in prompt
   the day after a strength session, open coach suggestions count, and a backup reminder (none in 14 days).
3. **Log.** Strength session (A or B, pre-filled from the current plan, + and − steppers per set and side,
   optional RIR per set, skip or modify with a reason, pain toggle per exercise, session effort, energy before,
   pain note, auto-timed duration, screen kept awake, run-protection switch when it applies); run (date,
   distance, duration, type, effort, sore legs affected this run?, notes; pace shown live); morning check-in;
   benchmark test.
4. **Progress.** Charts: per-exercise reps (or seconds) per session; run pace by type; weekly km; strength
   sessions and runs per week; session effort; benchmark history including 10K time.
5. **Coach.** Suggestions with reason and evidence, Accept, Edit, Reject; coach notes (recovery, holds);
   benchmark and block-review prompts; plan version history with revert; Copy summary for Claude.
6. **Plan.** Sessions A and B with each exercise's how-to, cues and swaps; edit any prescription (makes a new
   plan version, reason "Edited by you"); schedule; profile; backup, restore, reset.

## 6. Coach rules

Block phases by week of the current block (week 1 = the block's start week): weeks 1–2 establish,
3–4 build, 5–6 intensify, 7–8 consolidate and review. After week 8 the coach prompts the benchmark tests and
"Start next block". In every block, weeks 1–2 allow no increases.

An exercise is **ready to progress** when, counting only logs on or after its prescription's `since` date:
- its last two logs both have every prescribed set (every side) at or above the top of the range, the newer of
  them no more than 14 days old (no increases from old logs after a break), and
- reps in reserve averaged 2 or more in each of those logs (if RIR was not logged, session effort 7 or less), and
- no pain was flagged on it and no session carried a pain note from the first of those logs onwards, counting
  logs where the exercise was swapped or skipped (a skip with the reason "Pain" counts as pain), and
- for leg-heavy exercises, no run in the last 14 days was marked "sore legs affected this run" and no
  check-in in the last 7 days had leg soreness 4 or more, and
- the last three check-ins in the past 7 days do not average energy 2 or less or sleep 2 or less.

What a ready exercise gets, by phase:
- establish: nothing.
- build: +1 to the rep range (+2 when RIR averaged 3 or more); seconds ranges +5 s. When the top would pass
  the exercise's cap, the intensify lever is used instead.
- intensify: one lever, the first available in the exercise's lever order: slower tempo (+1 s lowering, cap
  5 s), longer pause (+1 s, cap 3 s), harder variation (next in its ladder, range resets to the base range),
  extra set (below `maxSets`, the estimated session length stays at or under 40 minutes, and logged durations
  of that session average at most 40 minutes).
- consolidate: +1 rep only.

Holding back (plan-changing suggestions, shown first):
- pain flagged on an exercise: easier variation if there is one, otherwise one set fewer (not below 1), with
  the stop-and-seek-advice line.
- reps below the bottom of the range in 2 of the last 3 logs: range lowered by 2 (not below 1).
- session effort 9 or more in the last two logs of a session: one set fewer on the exercise with the most sets
  (above 2).
- a run marked "sore legs affected this run": one set fewer on the leg-heavy exercise with the most sets in the
  strength session logged most recently before that run.

Coach notes (no plan change): two clean sessions at 0 RIR (hold); run effort up by 1.5 or more at a pace within
3 % for the same run type (ask about sleep, stress, illness, load); low energy or sleep in check-ins; weekly
run km more than 30 % above the previous three-week average; strength session placed the day before a long
or quality run; benchmark due (4 weeks since the last, overdue at 8).

Limits: at most one suggestion per exercise and two plan-changing suggestions per session open at a time;
holding back outranks progress. Each suggestion has a key built from its rule, exercise and evidence log ids;
a decided key is never shown again, so a rejected suggestion returns only with new evidence. Accepting (or
editing) creates a new plan version from the current one with the change applied, `since` set to today, and the
suggestion's reason. Reverting creates a new version that copies the chosen one.

Every suggestion's text names the evidence, for example: "You did 3 × 12 press-ups with 2 or more reps in
reserve in your last two Session A workouts (3 and 6 Nov). Add a rep: 3 × 9–13."

## 7. Scheduling

Recommend two strength days from the non-run days. Penalties: day before the long run −10, Friday −4 (recovery
preferred), Sunday −4 (rest, walking or mobility), day before the quality run −3, two days before the long run −2,
day after the long run −2, consecutive strength days −6. Highest total wins; ties go to Tuesday and Thursday. A goes on the earlier day, B on the later. The setup
shows the reasons and lets the owner pick other days.

Run protection applies when the long run is 1 or 2 days after the session date; a quality run the next day
shows the "keep lower-body moderate" cue.

## 8. Backup, restore, summary

- Back up: a file `strength-run-coach-backup-YYYY-MM-DD.json` holding `{ app, exportedAt, schemaVersion, state }`,
  sent through the share sheet (`navigator.share` with files) or downloaded where sharing is not available.
  Sets `lastBackupAt`.
- Restore: pick the file, check `app` and `schemaVersion`, show what it holds (dates, counts), confirm, replace.
  The replaced state is kept as `src-state-prev`.
- Copy summary for Claude: plain text of the profile, current plan, last four weeks of logs, check-ins,
  benchmarks and open suggestions, copied to the clipboard.

## 9. Install and offline

`manifest.webmanifest` (standalone, icons 192/512/maskable), `apple-touch-icon` 180 px, iOS meta tags,
`viewport-fit=cover` with safe-area padding, 16 px minimum input text (no iOS zoom). `sw.js` caches the file list
in `sw-files.js` (generated by `tools/sw-files.ps1` with a build stamp), answers cache-first, and shows "Update
ready" with a reload button when a new build is waiting. The Week screen explains how to install when the app is
opened in a Safari tab rather than from the home screen (Safari tabs keep separate storage).

## 10. Testing

- Unit tests (in-browser harness run by headless Edge, `tests/run-tests.ps1`): dates, pace, plan changes and
  duration estimate, scheduling, every coach rule and limit, storage (save, load, corrupt fallback, migration,
  backup validation), progress series, summary text.
- UI tests in the same harness: each screen renders from a sample state; a full strength log and a run log
  update the state; accept and reject change the plan and decisions.
- Visual check at 375 × 812 in the browser pane, light and dark, with screenshots for the owner.
- Owner's real-iPhone checks after publishing: install from Safari, log a session in airplane mode, back up to
  Files, restore, receive an update.

## 10a. Workout flow and timers (added 7 Nov 2026 after a mobile UX review)

- Focus mode: during a session the tab bar is hidden and a "Now" dock sits at the bottom (thumb reach).
  Week's Start creates the session at once (run protection on when it applies).
- Order: circuit by default (one set of each exercise per round, the brief's "rounds"), or one exercise at a
  time. Both sides of a set go back to back. Next set = the next unfinished one after the last done.
- Dock modes: warm-up (optional 5-minute timer), set (exercise, target, set and side, last time, stepper,
  Done), rest (countdown, −15/+15/Skip, "reps left in the tank?" 0–4+ for the set just done, what is next),
  hold (3-2-1 lead-in, counts up, beeps at the bottom and top of the target, Stop logs the seconds),
  done (Finish). Rest defaults 45 s between exercises, 75 s between rounds or straight sets; 5 s to switch
  sides after a hold. Timers are timestamps in the draft, so they survive the screen locking.
- Beeps: Web Audio after the first tap; muted by the iPhone silent switch unless "Beep on silent" is on
  (Audio Session 'playback', unverified on a device). The countdown and a colour flash always show.
- Prefill: reps start at last time's number or the bottom of the range, whichever is higher; holds start at
  the bottom. Done rows collapse to their result with Edit.
- Finish sheet (effort required, pain, notes, duration; over 90 min on the clock asks for the real
  duration), then a summary against the previous log, new suggestions and a backup nudge (7 days).
  Saved sessions can be edited for 48 hours.
- Coach cards show the numbers behind each suggestion; a decided card keeps its place and height for 8 s
  with Undo (undo removes the plan version while it is the latest).
- Runs only tick a planned run on another day when logged as that run ("This run is …") or when they fill
  an already-missed slot of a fitting type; extras are counted separately.
- Deletes happen at once with Undo instead of a confirm. A three-tap check-in shows on Week until noon.

## 11. Not in version 1

Reminder notifications (iPhone web push needs a server), cloud sync or accounts, Strava or Apple Health import,
CSV export, reasons on Reject.
