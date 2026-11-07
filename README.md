# Circuit Coach

A personal web app for two bodyweight circuit sessions a week. It runs each session with timers, logs
every set, shows progress, and suggests plan changes with the evidence behind them. You accept, edit or
reject every change. It works offline and installs on an iPhone from Safari.

## Install on an iPhone

1. Open the app's link in **Safari** (not Chrome).
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open **Coach** from the home screen and answer the setup questions (about a minute).

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

- **Week:** what's next (Start goes straight into the session), this week's sessions, a three-tap
  morning check-in until noon, schedule warnings.
- **Workout:** the panel at the bottom leads you through the circuit: a guided 5-minute warm-up (one move
  at a time, each with its own countdown; Pause, Skip move or End warm-up), then each set with big + / − and
  Done, one set of each exercise per round. Done starts the rest timer (45 s
  between exercises, 75 s between rounds by default; change it under Rest), and during the rest you can
  say how many reps you had left. Timed exercises like the side plank have a hold timer (3-2-1, then it
  counts up and logs the seconds). Every exercise, harder version and swap has its own How to steps,
  with a picture. When every set is done, a guided 4-minute cool-down is offered before Finish. Finish asks
  for effort, pain and notes, then shows how the session compared with last time. Beeps play only while the app is
  open (the screen stays on); the iPhone silent switch mutes them unless you turn on "Beep on silent".
- **Log:** a session, a morning check-in, or benchmark tests. Tap any recent entry to see, edit or delete
  it (Undo for 6 seconds; sessions can be edited for 48 hours).
- **Progress:** consistency, each exercise over time, session effort, benchmarks.
- **Coach:** suggested changes with the numbers behind them, Accept / Edit / Reject (with Undo), where
  each exercise stands (how close it is to its next step, or why it is waiting), notes,
  plan history (go back to any version), and **Copy summary for Claude** for a second opinion in a chat.
- **Plan:** the exercises with how-to steps, pictures and swaps, your training days, profile, backup and
  restore, and image credits.

## How the programme evolves

An exercise steps up only when the last two workouts of it hit the top of the range on every set, with 2
or more reps in reserve (or session effort 7 or less), no pain, and recovery looks fine. Each 8-week block:
weeks 1–2 hold steady; weeks 3–4 add reps; weeks 5–6 change one thing (slower lowering, longer pause, a
harder version such as press-up → close-grip → archer, or an extra set if the session stays within 40
minutes); weeks 7–8 hold and test. Then a **block review** shows how the 8 weeks went (sessions done,
each exercise's trend and step-ups, benchmarks) and proposes changes for the next block, only where
something needs it: a fresh challenge for a stalled exercise, a gentler swap after repeated pain, or a set
fewer or more if sessions ran long or short. You switch each change on or off before starting the next
block (Undo afterwards, and every plan version is kept). It eases off first when you report
pain, miss reps, rate sessions 9+ or report high leg soreness. At most two changes per session at a time.
Nothing changes until you accept it.

This is general fitness guidance, not medical care.

## Development

No Node and no build step: plain HTML, CSS and JavaScript modules.

- Run the tests (headless Edge, needs Python on PATH): `tests/run-tests.ps1` (`-Grep coach` for a subset).
- Serve locally: `python tests/serve.py 8765 .` then open http://localhost:8765/?nosw=1
  (`?nosw=1` skips the offline cache while developing).
- Sample data for checking screens, in memory only: `?demo=1` (four weeks in), `?demo=fresh`
  (first run), `?demo=logging` (a session in progress), `?demo=review` (a finished block).
- After changing any app file, run `tools/sw-files.ps1` to refresh the offline file list and build
  stamp; a test fails if you forget.
- Icons: `python tools/icons.py`.
- Exercise pictures are openly licensed; sources, authors and licences are in `assets/exercises/CREDITS.md`
  and on the Plan tab.
- Design: `docs/superpowers/specs/2026-11-07-strength-run-coach-design.md`.
