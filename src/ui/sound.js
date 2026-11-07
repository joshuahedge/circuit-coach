// Short beeps for the timers, made with Web Audio (no sound files). iPhone Safari only allows audio after a
// tap, so unlockSound() runs on the first Done/Start tap. On an iPhone the ring/silent switch mutes these,
// so the timers are always visible too. Vibration is used where the browser has it (not on iPhone).

let ctx = null;

export function unlockSound(win) {
  try {
    if (!ctx) {
      const AC = win.AudioContext || win.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* no audio */ }
}

function tone(freq, start, dur, gain = 0.2) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.03);
}

const VIBES = { count: [40], go: [120, 60, 120], target: [80] };

// kind: 'count' (3-2-1), 'go' (rest over / hold starts), 'target' (hold reached the target)
export function beep(app, kind) {
  if (app.state && app.state.settings && app.state.settings.sound === false) return;
  try {
    const nav = app.win.navigator;
    if (nav && typeof nav.vibrate === 'function') nav.vibrate(VIBES[kind] || [60]);
  } catch (e) { /* ignore */ }
  if (!ctx || ctx.state !== 'running') return;
  try {
    const t = ctx.currentTime + 0.01;
    if (kind === 'count') tone(660, t, 0.12);
    else if (kind === 'go') { tone(880, t, 0.14); tone(1320, t + 0.17, 0.28); } else tone(990, t, 0.22);
  } catch (e) { /* ignore */ }
}
