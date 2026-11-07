// A guided routine (warm-up, cool-down, mobility): one move at a time, each with its own countdown.
// Times are epoch milliseconds, so a routine stays right when the phone locks. Functions mutate `g`.

export function startGuide(steps, nowMs) {
  return { steps, idx: 0, endsAt: nowMs + steps[0].sec * 1000, pausedLeft: null, startedAt: nowMs };
}

export function guideDone(g) {
  return g.idx >= g.steps.length;
}

// Move past every step whose time is up. Returns how many steps finished.
export function advanceGuide(g, nowMs) {
  let n = 0;
  while (g.pausedLeft === null && !guideDone(g) && nowMs >= g.endsAt) {
    g.idx += 1;
    n += 1;
    if (!guideDone(g)) g.endsAt += g.steps[g.idx].sec * 1000;
  }
  return n;
}

export function skipStep(g, nowMs) {
  if (guideDone(g)) return;
  g.idx += 1;
  g.pausedLeft = null;
  if (!guideDone(g)) g.endsAt = nowMs + g.steps[g.idx].sec * 1000;
}

export function pauseGuide(g, nowMs) {
  if (g.pausedLeft === null && !guideDone(g)) g.pausedLeft = Math.max(0, g.endsAt - nowMs);
}

export function resumeGuide(g, nowMs) {
  if (g.pausedLeft === null) return;
  g.endsAt = nowMs + g.pausedLeft;
  g.pausedLeft = null;
}

export function guideRemaining(g, nowMs) {
  if (guideDone(g)) return 0;
  const left = g.pausedLeft !== null ? g.pausedLeft : g.endsAt - nowMs;
  return Math.max(0, Math.ceil(left / 1000));
}

export function guideTotalLeft(g, nowMs) {
  if (guideDone(g)) return 0;
  return guideRemaining(g, nowMs) + g.steps.slice(g.idx + 1).reduce((s, x) => s + x.sec, 0);
}
