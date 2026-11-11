// How-tos for every harder version and swap, and the guided routines (warm-ups, cool-down).
// Kept apart from library.js so the exercise list stays readable. No burpees or mountain climbers.
import { exerciseById, allExercises, BYSA3, BYSA4 } from './library.js';
import { MORE_VARIATIONS } from './moreExercises.js';

// Steps for each version or swap that is not an exercise's own base movement. `image` is set in
// VARIATION_IMAGES (below) where an openly licensed picture exists.
export const VARIATIONS = {
  'Reverse lunge to knee drive': {
    howTo: ['Step back into a reverse lunge, lowering slowly.', 'Drive up through the front heel.', 'As you stand, bring the back knee up to hip height in front of you and balance for a moment.', 'Step straight back into the next rep. All reps on one leg, then switch.'],
    cues: 'Stand tall at the top; balance before the next rep.',
  },
  'Assisted skater squat (fingertip support)': {
    howTo: ['Stand on one leg, fingertips lightly on a wall or door frame for balance.', 'Bend the standing knee and lower, letting the free knee travel back towards the floor behind you.', 'Lower until the back knee almost touches the floor (a folded towel underneath helps), chest leaning a little forward.', 'Push through the whole standing foot to stand. Fingertips for balance only.'],
    cues: 'Slow down, controlled up; the fingertips balance, they do not pull.',
  },
  'Skater squat': {
    howTo: ['Stand on one leg, arms reaching forward for balance.', 'Bend the standing knee and lower, letting the free knee travel back towards the floor behind you.', 'Lower until the back knee almost touches the floor, chest leaning a little forward.', 'Push through the whole standing foot to stand. Go back to the assisted version if balance limits control.'],
    cues: 'Knee in line with the toes; slow on the way down.',
  },
  'Split squat': {
    howTo: ['Take a long stride: one foot forward, the back heel lifted.', 'Lower straight down until both knees bend to about 90°.', 'Push through the front foot to rise, keeping both feet where they are.', 'All reps on one side, then switch.'],
    cues: 'Straight down and up; front knee over the toes.',
  },
  'Lateral lunge': {
    howTo: ['Stand with your feet wide.', 'Sit back and to one side, bending that knee while the other leg stays straight.', 'Keep your chest up and the bent knee over the toes.', 'Push back to the middle. All reps on one side, then switch.'],
    cues: 'Sit back into the hip; keep the straight leg straight.',
  },
  'Close-grip press-up': {
    howTo: ['Hands under your shoulders or a little narrower, body in one straight line.', 'Lower for about 2 s with your elbows close to your sides.', 'Stop with your chest a fist off the floor, then press up.', 'Harder on the backs of the arms: fewer reps are normal at first.'],
    cues: 'Elbows brush your sides; body stays in one line.',
  },
  'Assisted archer press-up': {
    howTo: ['Hands about twice shoulder width, fingers turned slightly out.', 'Lower towards one hand, bending that elbow while the other arm stays almost straight.', 'Press back to the middle. Alternate sides and log the reps per side.', 'Let the straight arm help as much as you need.'],
    cues: 'Shift your weight over the bending arm; stay in one line.',
  },
  'Knee press-up': {
    howTo: ['Kneel with hands just wider than your shoulders, body straight from knees to head.', 'Lower for about 2 s until your chest is a fist off the floor.', 'Press up without bending at the hips.', 'Move back to full press-ups when these get easy.'],
    cues: 'Straight line from knees to head.',
  },
  'Tempo press-up': {
    howTo: ['Set up as for a normal press-up, body in one straight line.', 'Lower slowly over 4 s.', 'Pause just above the floor, then press up in about 1 s.', 'Fewer reps than usual is fine: the slow lowering is the work.'],
    cues: 'Four seconds down, every rep.',
  },
  'Single-leg glute bridge, heel further away': {
    howTo: ['Lie on your back with the planted foot 10–15 cm further from your hips than usual.', 'Drive through that heel to lift your hips; the other leg stays raised.', 'Pause 2 s at the top with your pelvis level.', 'Lower slowly. You will feel it more in the back of the thigh.'],
    cues: 'Pelvis level; push through the heel.',
  },
  'Glute bridge (both legs) with 3 s pause': {
    howTo: ['Lie on your back, feet flat and hip-width apart, close to your hips.', 'Drive through your heels to lift your hips until your body is straight from knees to shoulders.', 'Squeeze and hold 3 s at the top.', 'Lower slowly.'],
    cues: 'Ribs down; squeeze at the top.',
  },
  'Bridge march': {
    howTo: ['Lift into a two-leg glute bridge.', 'Keeping your hips level, lift one foot a few centimetres off the floor.', 'Put it down and lift the other.', 'Each lift counts as one per side. Keep the hips from dropping or twisting.'],
    cues: 'Hips stay level and high.',
  },
  'Prone swimmers': {
    howTo: ['Lie face down, forehead on a folded towel, arms overhead hovering just off the floor.', 'Sweep your arms round and down until your hands reach your lower back, bending your elbows at the end.', 'Sweep them back overhead.', 'Small, slow movements; keep your shoulders away from your ears.'],
    cues: 'Hover the whole time; no swinging.',
  },
  'Superman hold': {
    howTo: ['Lie face down, arms overhead.', 'Lift your arms, chest and legs a few centimetres off the floor.', 'Hold for 3 s, then lower.', 'Each hold counts as one rep.'],
    cues: 'Long and low; look at the floor.',
  },
  'Long-lever dead bug': {
    howTo: ['Lie on your back, arms up, legs straight up over your hips.', 'Press your lower back gently into the mat.', 'Breathe out as you lower the opposite arm and straight leg towards the floor.', 'Return and switch. Bend the knee a little if your back starts to lift.'],
    cues: 'Lower back stays down; move slowly.',
  },
  'Bird dog': {
    howTo: ['On hands and knees: hands under shoulders, knees under hips.', 'Reach one arm forward and the opposite leg back until both are level with your body.', 'Pause 2 s without twisting your hips.', 'Return and switch.'],
    cues: 'Hips square to the floor; long, not high.',
  },
  'Heel taps': {
    howTo: ['Lie on your back, knees bent 90° over your hips.', 'Press your lower back gently into the mat.', 'Slowly lower one foot to tap the heel on the floor.', 'Bring it back and switch.'],
    cues: 'Lower back stays down; slow taps.',
  },
  'Single-leg Romanian deadlift to knee drive': {
    howTo: ['Do a single-leg Romanian deadlift: hinge at the hip, back leg reaching long.', 'As you stand, drive the back knee forward and up to hip height.', 'Balance for a moment at the top.', 'All reps on one leg, then switch.'],
    cues: 'Hinge, then stand tall and balance.',
  },
  'Kickstand Romanian deadlift': {
    howTo: ['One foot forward taking most of your weight; the other back with only its toes touching for balance.', 'Soft front knee; hinge at the hips, reaching your hands down the front leg over 3 s.', 'Keep your back flat and hips square.', 'Squeeze the front glute to stand. Switch after the set.'],
    cues: 'Front leg does the work; back toes just balance.',
  },
  'Good morning (both legs)': {
    howTo: ['Feet hip-width apart, hands on your chest.', 'Soft knees; hinge forward by pushing your hips back, back flat.', 'Stop when you feel the backs of your thighs stretch.', 'Stand tall by pushing your hips forward.'],
    cues: 'Hips back, back flat.',
  },
  'Tempo squat, 1½ reps': {
    howTo: ['Lower into a squat over 3 s.', 'Rise halfway up.', 'Lower back to the bottom.', 'Stand all the way up. That is one rep.'],
    cues: 'Smooth and controlled; the half rep counts.',
  },
  'Cossack squat': {
    howTo: ['Take a very wide stance, toes slightly out.', 'Shift to one side, bending that knee deeply while the other leg stays straight with its toes up.', 'Go only as low as you can keep the bent-leg heel down.', 'Push back up and switch. Log reps per side.'],
    cues: 'Heel down, chest up, knee over the toes.',
  },
  'Pause squat': {
    howTo: ['Feet about shoulder-width, toes slightly out.', 'Squat down at a normal speed.', 'Pause 3 s at the bottom without bouncing.', 'Stand up smoothly.'],
    cues: 'Hold the bottom still for the full pause.',
  },
  'Pike push-up, more upright': {
    howTo: ['Start in a pike with your hands further from your feet, so your body is less upside-down.', 'Bend your elbows to lower your head towards the floor in front of your hands.', 'Press back up.', 'Shorten the range if your shoulders complain.'],
    cues: 'Easier angle; same movement.',
  },
  'Pike push-up, feet closer to hands': {
    howTo: ['Walk your feet closer to your hands so your hips are higher and your body more upright.', 'Bend your elbows to lower your head towards the floor.', 'Press back up.', 'Harder on the shoulders: stop if they hurt or form slips.'],
    cues: 'Hips high; head goes in front of the hands.',
  },
  'Pike shoulder taps': {
    howTo: ['Hold the pike (downward-dog) shape, hips high.', 'Lift one hand and tap the opposite shoulder.', 'Put it down and switch, keeping your hips steady.', 'Each tap counts as one per side.'],
    cues: 'Hips still; slow taps.',
  },
  'Single-leg bent-knee calf raise': {
    howTo: ['Stand on one foot, fingertips on a wall, standing knee slightly bent.', 'Keep that bend as you rise onto the ball of the foot over 2 s.', 'Pause at the top, then lower over 3 s.', 'This works the deeper calf muscle.'],
    cues: 'Knee stays bent the whole time.',
  },
  'Double-leg slow calf raise': {
    howTo: ['Stand on both feet, fingertips on a wall.', 'Rise onto the balls of your feet over 3 s.', 'Pause at the top.', 'Lower over 3 s.'],
    cues: 'Full range, slow both ways.',
  },
  'Calf raise hold': {
    howTo: ['Stand on one or both feet, fingertips on a wall.', 'Rise onto the balls of your feet.', 'Hold for 5 s at the top.', 'Lower slowly. Each hold counts as one rep.'],
    cues: 'High on the toes; still hold.',
  },
  'Side plank from knees': {
    howTo: ['Lie on your side, elbow under your shoulder, knees bent behind you.', 'Lift your hips so your body is straight from knees to head.', 'Hold without letting the hips drop.', 'Switch sides.'],
    cues: 'Hips up and forward.',
  },
  'Side plank with top-leg raise': {
    howTo: ['Lift into a full side plank.', 'Raise your top leg 20–30 cm and hold it there.', 'Keep your hips high the whole time.', 'Switch sides. Drop the leg before your hips drop.'],
    cues: 'Hips high; top leg straight.',
  },
  'Side-lying leg raise': {
    howTo: ['Lie on your side, head resting on your lower arm.', 'Keep your top leg straight, toes pointing forward.', 'Lift it slowly 30–40 cm, then lower over 2 s.', 'For timed sets, hold the leg up.'],
    cues: 'Toes forward, not up; slow.',
  },
};

// The steps and cues for whatever version is being done. Falls back to the exercise's own how-to.
export function howToFor(exerciseId, variation) {
  const ex = exerciseById(exerciseId);
  if (!variation || variation === ex.name) return { name: ex.name, howTo: ex.howTo, cues: ex.cues, own: true };
  if (VARIATIONS[variation]) return { name: variation, ...VARIATIONS[variation], own: true };
  if (MORE_VARIATIONS[variation]) return { name: variation, ...MORE_VARIATIONS[variation], own: true };
  const other = allExercises().find((e) => e.name === variation);
  if (other) return { name: other.name, howTo: other.howTo, cues: other.cues, own: true, exerciseId: other.id };
  return { name: ex.name, howTo: ex.howTo, cues: ex.cues, own: false };
}

// Guided routines: each step has a name, a time in seconds and an optional one-line cue.
export const WARMUP_STEPS = {
  A: [
    { name: 'March or jog on the spot', sec: 45, cue: 'Easy pace, arms swinging.' },
    { name: 'Bodyweight squats', sec: 45, cue: 'Smooth, comfortable depth.' },
    { name: 'Alternating reverse lunges', sec: 60, cue: 'Step back, light and controlled.' },
    { name: 'Glute bridges', sec: 45, cue: 'Squeeze at the top.' },
    { name: 'Arm circles', sec: 30, cue: 'Forwards, then backwards.' },
    { name: 'Bird dogs', sec: 60, cue: 'Slow, alternate sides.' },
  ],
  B: [
    { name: 'Hip hinges', sec: 45, cue: 'Hands on hips, push them back.' },
    { name: 'Leg swings', sec: 60, cue: 'Front to back; switch legs halfway.' },
    { name: 'Calf raises', sec: 45, cue: 'Both feet, full range.' },
    { name: 'Alternating lunges', sec: 60, cue: 'Light and controlled.' },
    { name: 'Bird dogs', sec: 45, cue: 'Slow, alternate sides.' },
    { name: 'Shoulder circles', sec: 30, cue: 'Big, slow circles.' },
  ],
};

export const COOLDOWN_STEPS = [
  { name: 'Hip-flexor stretch, left', sec: 30, cue: 'Kneel on the left knee, tuck the hips under.' },
  { name: 'Hip-flexor stretch, right', sec: 30, cue: 'Kneel on the right knee, tuck the hips under.' },
  { name: 'Calf stretch, left', sec: 30, cue: 'Hands on a wall, left heel down.' },
  { name: 'Calf stretch, right', sec: 30, cue: 'Hands on a wall, right heel down.' },
  { name: '90/90 hip switches', sec: 60, cue: 'Sit tall, knees side to side.' },
  { name: 'Thoracic rotations', sec: 60, cue: 'On your side, open the top arm; switch halfway.' },
];

export function routineMinutes(steps) {
  return Math.round(steps.reduce((s, x) => s + x.sec, 0) / 60);
}

// Pictures for versions and swaps, from openly licensed sources (credits in assets/exercises/CREDITS.md).
// Same shape as the exercise images in library.js. Versions without one show the base exercise's picture,
// labelled as such: only exact matches were taken.
const TWO_LEG_CALF = {
  ...BYSA4, credit: 'BruceBlaus', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Exercise_Heel_Raise_Two_Legs.png', changes: 'resized',
  srcs: [{ src: 'assets/exercises/calf-raise-two-legs.jpg', w: 560, h: 420 }],
  alt: 'Two-leg heel raise, seen from behind: standing flat, then up on the balls of both feet.',
};

export const VARIATION_IMAGES = {
  'Split squat': {
    ...BYSA4, credit: 'Yashjoshi2102', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sakshi_Malik_fitness_(lunge).jpg', changes: 'cropped, resized',
    srcs: [{ src: 'assets/exercises/split-squat.jpg', w: 600, h: 629 }],
    alt: 'Split squat: hands on hips, one foot forward, back knee lowered close to the floor.',
  },
  'Side-lying leg raise': {
    ...BYSA3, credit: 'Klewis425', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Side_Leg_Raise.jpg', changes: 'cropped, resized',
    srcs: [{ src: 'assets/exercises/side-leg-raise.jpg', w: 670, h: 295 }],
    alt: 'Side-lying leg raise: lying on one side, head on the lower arm, top leg lifted straight.',
  },
  'Double-leg slow calf raise': TWO_LEG_CALF,
  'Calf raise hold': TWO_LEG_CALF,
};
