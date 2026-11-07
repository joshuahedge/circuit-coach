# Strength & Running Coach

A personal web app for tracking two bodyweight strength sessions and three runs a week. It logs workouts,
runs and recovery, shows progress, and suggests plan changes with the evidence behind them. You accept,
edit or reject every change. It works offline and installs on an iPhone from Safari.

Live: https://joshuahedge.github.io/strength-run-coach/

## Install on an iPhone

1. Open the link above in **Safari** (not Chrome).
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open **Coach** from the home screen and answer the setup questions (about two minutes).

Always log from the home-screen app. A Safari tab keeps its own separate storage, so anything logged
there will not show up in the installed app.

## Your data

- Everything stays on the phone. Nothing is sent anywhere.
- **Back up** regularly (Plan tab, or the reminder on the Week screen): it opens the share sheet. Choose
  **Save to Files** and pick iCloud Drive. **Restore** reads that file back.
- Removing the app from the home screen deletes its data, so back up first.
- A workout in progress is saved after every tap. If the phone closes the app mid-session, reopen it
  and tap **Resume**.

## Using it

- **Week:** what's next (Start goes straight into the session), this week's runs and sessions, a
  three-tap morning check-in until noon, schedule warnings.
- **Workout:** the panel at the bottom leads you through it: a 5-minute warm-up timer, then each set
  with big + / − and Done. Done starts the rest timer (45 s between exercises, 75 s between rounds by
  default; change it under Rest), and during the rest you can say how many reps you had left. Timed
  exercises like the side plank have a hold timer (3-2-1, then it counts up and logs the seconds).
  Circuit order by default (one set of each exercise per round), or one exercise at a time. Finish
  asks for effort, pain and notes, then shows how the session compared with last time. Beeps play only
  while the app is open (the screen stays on); the iPhone silent switch mutes them unless you turn on
  "Beep on silent".
- **Log:** a run (with one-tap "same as a recent run"), a morning check-in, or benchmark tests. Tap any
  recent entry to see, edit or delete it (Undo for 6 seconds; strength sessions can be edited for 48 hours).
- **Progress:** weekly km, consistency, each exercise, run pace by type, session effort, benchmarks.
- **Coach:** suggested changes with the numbers behind them, Accept / Edit / Reject (with Undo), notes,
  plan history (go back to any version), and **Copy summary for Claude** for a second opinion in a chat.
- **Plan:** the exercises with how-to steps and swaps, the schedule, your profile, backup and restore.

## How the coach decides

An exercise steps up only when the last two workouts of it hit the top of the range on every set, with 2
or more reps in reserve (or session effort 7 or less), no pain, and recovery looks fine. Weeks 1–2 of
each 8-week block hold steady; weeks 3–4 add reps; weeks 5–6 change one thing (slower lowering, longer
pause, a harder version, or an extra set if the session stays within 40 minutes); weeks 7–8 hold and
test. It eases off first when you report pain, miss reps, rate sessions 9+ or say sore legs affected a
run. At most two changes per session at a time. Nothing changes until you accept it.

This is general fitness guidance, not medical care.

## Development

No Node and no build step: plain HTML, CSS and JavaScript modules.

- Run the tests (headless Edge, needs Python on PATH): `tests/run-tests.ps1` (`-Grep coach` for a subset).
- Serve locally: `python tests/serve.py 8765 .` then open http://localhost:8765/?nosw=1
  (`?nosw=1` skips the offline cache while developing).
- Sample data for checking screens, in memory only: `?demo=1` (four weeks in), `?demo=fresh`
  (first run), `?demo=logging` (a session in progress).
- After changing any app file, run `tools/sw-files.ps1` to refresh the offline file list and build
  stamp; a test fails if you forget.
- Icons: `python tools/icons.py`.
- Design: `docs/superpowers/specs/2026-11-07-strength-run-coach-design.md`.
