// Plain-text training summary to paste into a Claude chat for a second opinion.
import { currentPlan, prescriptionLabel, sessionIds, tempoLabel } from './plan.js';
import { blockInfo } from './schedule.js';
import { coachReview } from './coach.js';
import { DAY_KEYS, DAY_SHORT, addDays, formatDay, formatShort } from './dates.js';

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export function setsText(e) {
  if (e.status === 'skipped') return `skipped${e.reason ? ` (${e.reason})` : ''}`;
  const unit = e.target && e.target.unit === 'seconds' ? ' s' : '';
  const sides = [...new Set(e.sets.map((s) => s.side))];
  const parts = sides.map((side) => {
    const vals = e.sets.filter((s) => s.side === side).map((s) => `${s.value}${unit}`).join(', ');
    return side ? `${side} ${vals}` : vals;
  });
  const rirs = e.sets.map((s) => s.rir).filter((r) => typeof r === 'number');
  const lo = Math.min(...rirs);
  const hi = Math.max(...rirs);
  const rir = rirs.length ? ` (RIR ${lo === hi ? lo : `${lo}–${hi}`})` : '';
  const extra = [e.status === 'modified' ? `modified${e.reason ? `: ${e.reason}` : ''}` : '', e.pain ? 'PAIN flagged' : '']
    .filter(Boolean).join('; ');
  return `${parts.join(' · ')}${rir}${extra ? ` [${extra}]` : ''}`;
}

export function buildSummary(state, today) {
  const lines = [];
  const from = addDays(today, -27);
  const recent = (x) => x.date >= from && x.date <= today;
  const p = state.profile;
  const plan = currentPlan(state);
  const block = blockInfo(state, today);

  lines.push(`CIRCUIT COACH: TRAINING SUMMARY (${formatDay(today)})`);
  lines.push('');
  lines.push('PROFILE');
  const body = [p.age ? `age ${p.age}` : '', p.heightCm ? `${p.heightCm} cm` : '', p.weightKg ? `${p.weightKg} kg` : '', p.level || '']
    .filter(Boolean).join(', ');
  if (body) lines.push(`- ${body}`);
  lines.push(`- Goals: ${p.goals.join('; ')}`);
  const kit = p.equipment.filter((x) => x !== 'bodyweight');
  lines.push(`- Constraints: bodyweight only${kit.length ? `, ${kit.join(', ')}` : ''}; strength sessions ${p.sessionMinutes.join('–')} min; done as circuits; never ${p.disliked.join(' or ')}.`);
  lines.push('');
  lines.push('SCHEDULE');
  const lifts = DAY_KEYS.filter((d) => state.schedule.strengthDays[d]).map((d) => `${DAY_SHORT[d]} Session ${state.schedule.strengthDays[d]}`);
  lines.push(`- Sessions: ${lifts.join(', ') || 'not set'}`);
  lines.push(`- Block ${block.number}, week ${block.week} (${block.label})`);
  lines.push('');
  if (plan) {
    lines.push(`CURRENT PLAN (version ${plan.version}, from ${formatShort(plan.effectiveFrom)}: ${plan.reason})`);
    for (const id of sessionIds(plan)) {
      const s = plan.sessions[id];
      lines.push(`${s.name}: ${s.focus}`);
      for (const rx of s.exercises) {
        const t = tempoLabel(rx);
        lines.push(`- ${rx.variation}: ${prescriptionLabel(rx)}${t ? ` (${t})` : ''}`);
      }
    }
    lines.push('');
  }
  lines.push(`LAST 4 WEEKS (${formatShort(from)} to ${formatShort(today)})`);
  const strength = state.strengthLogs.filter(recent).sort(byDate);
  lines.push(`Strength sessions: ${strength.length}`);
  for (const l of strength) {
    const meta = [l.durationMin ? `${l.durationMin} min` : '', typeof l.rpe === 'number' ? `effort ${l.rpe}/10` : '',
      typeof l.energyBefore === 'number' ? `energy before ${l.energyBefore}/5` : '']
      .filter(Boolean).join(', ');
    lines.push(`- ${formatDay(l.date)}, Session ${l.sessionId}${meta ? `, ${meta}` : ''}`);
    for (const e of l.exercises) lines.push(`    ${e.variation}: ${setsText(e)}`);
    if (l.pain) lines.push(`    Pain note: ${l.pain}`);
    if (l.notes) lines.push(`    Notes: ${l.notes}`);
  }
  const checks = state.checkins.filter(recent).sort(byDate);
  if (checks.length) {
    lines.push('Check-ins (energy /5, sleep /5, leg soreness /5):');
    for (const c of checks) lines.push(`- ${formatDay(c.date)}: energy ${c.energy}, sleep ${c.sleep}, legs ${c.legSoreness}${c.pain ? `, pain: ${c.pain}` : ''}`);
  }
  lines.push('');
  const benches = [...state.benchmarks].sort(byDate);
  if (benches.length) {
    lines.push('BENCHMARKS');
    for (const b of benches) {
      const bits = [b.pressUps != null ? `press-ups ${b.pressUps}` : '', b.plankSec != null ? `plank ${b.plankSec} s` : '',
        b.bridgeLeft != null ? `SL bridge L ${b.bridgeLeft} / R ${b.bridgeRight}` : '', b.squats != null ? `squats ${b.squats}` : '',
        b.lunges != null ? `lunges ${b.lunges}` : '']
        .filter(Boolean).join(', ');
      lines.push(`- ${formatShort(b.date)}: ${bits}${b.notes ? ` (${b.notes})` : ''}`);
    }
    lines.push('');
  }
  const review = coachReview(state, today);
  if (review.suggestions.length || review.notes.length) {
    lines.push("THE APP'S COACH SAYS");
    for (const s of review.suggestions) lines.push(`- Suggestion: ${s.reason}`);
    for (const n of review.notes) lines.push(`- ${n.title}: ${n.text}`);
    lines.push('');
  }
  lines.push('Please review this as an experienced strength and conditioning coach: what is going well, what to watch, and whether any plan change makes sense. Keep to my constraints and explain your reasoning.');
  return lines.join('\n');
}
