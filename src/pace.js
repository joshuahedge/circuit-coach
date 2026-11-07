// Run durations and pace. Durations are typed as minutes ("65"), m:ss ("28:05") or h:mm:ss ("1:05:30").

export function parseDuration(text) {
  const s = String(text ?? '').trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(s)) return null;
  const nums = s.split(':').map(Number);
  let sec;
  if (nums.length === 1) sec = nums[0] * 60;
  else if (nums.length === 2) {
    if (nums[1] > 59) return null;
    sec = nums[0] * 60 + nums[1];
  } else {
    if (nums[1] > 59 || nums[2] > 59) return null;
    sec = nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  return sec > 0 ? sec : null;
}

const pad = (n) => String(n).padStart(2, '0');

export function formatDuration(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function paceSecPerKm(km, sec) {
  if (!(km > 0) || !(sec > 0)) return null;
  return sec / km;
}

export function formatPace(secPerKm) {
  if (!(secPerKm > 0)) return '–';
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${pad(s % 60)} /km`;
}
