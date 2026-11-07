// Exercise library: bodyweight only, mat and a small space. No burpees or mountain climbers, ever.
// ladder: harder variations in order, each with its own starting range (and sides when they change).
// swaps: alternatives at the same numbers; `sides` only where they are done differently (both legs at once,
// or one leg at a time).
// levers: the order the coach tries when an exercise is ready to progress in the intensify phase.
// cap: the highest top-of-range the coach will add reps to before switching to a lever.

export const SAFETY_NOTE = 'General fitness guidance, not medical care. Stop any exercise that causes sharp, '
  + 'worsening or unusual pain, and get professional advice if it continues.';

export const LIMITATION_NOTE = 'Bodyweight-only training has limits for back and pulling strength. Y–T–W raises '
  + 'and other floor-based shoulder-blade work cover it safely for now. Door and towel anchors are left out on '
  + 'purpose. If you get equipment later (a pull-up bar or bands), the plan can change.';

export const WARMUPS = {
  A: 'March or gentle jog on the spot, bodyweight squats, alternating reverse lunges, glute bridges, arm circles, '
    + 'bird dogs. Move smoothly; this is not a fitness test.',
  B: 'Hip hinges (good mornings), leg swings, calf raises, alternating lunges, bird dogs, shoulder circles.',
};

export const COOLDOWN = 'Gentle hip-flexor stretch, calf stretch, 90/90 hip rotations and thoracic rotations. '
  + 'No need to force range or make stretching painful.';

export const REST_NOTE = 'Rest 30–60 s between exercises and 60–90 s between rounds: enough to keep technique strong.';

const LR = ['L', 'R'];

export const EXERCISES = {
  'reverse-lunge': {
    id: 'reverse-lunge', name: 'Reverse lunge', unit: 'reps', sides: LR, legHeavy: true, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Reverse lunge', min: 8, max: 10 },
      { name: 'Reverse lunge to knee drive', min: 8, max: 10 },
      { name: 'Assisted skater squat (fingertip support)', min: 6, max: 8 },
      { name: 'Skater squat', min: 5, max: 8 },
    ],
    howTo: [
      'Stand tall with feet hip-width apart.',
      'Step one foot back and lower slowly (2–3 s) until both knees are bent to about 90°.',
      'Keep the front foot flat and the front knee in line with your toes.',
      'Push through the front heel to stand. Do all reps on one leg, then switch.',
    ],
    cues: 'Controlled lowering, stable front foot, comfortable range.',
    swaps: [
      { name: 'Split squat', note: 'Feet stay planted: less balance, same leg work.' },
      { name: 'Lateral lunge', note: 'Side-to-side version; easier on the knees for some people.' },
    ],
  },
  'press-up': {
    id: 'press-up', name: 'Press-up', unit: 'reps', sides: null, legHeavy: false, cap: 20,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Press-up', min: 8, max: 12 },
      { name: 'Close-grip press-up', min: 6, max: 10 },
      { name: 'Assisted archer press-up', min: 4, max: 6, sides: LR },
    ],
    howTo: [
      'Hands just wider than shoulders, body in one straight line from head to heels.',
      'Lower for about 2 s until your chest is a fist off the floor.',
      'Elbows about 45° from your sides, not flared out.',
      'Press back up without letting the hips sag. Stop before form breaks.',
    ],
    cues: 'About 2 s down, body in one line, 1–3 reps in reserve.',
    swaps: [
      { name: 'Knee press-up', note: 'Same movement from the knees when full reps are not clean.' },
      { name: 'Tempo press-up', note: 'Slow 4 s lowering for more work with fewer reps.' },
    ],
  },
  'sl-glute-bridge': {
    id: 'sl-glute-bridge', name: 'Single-leg glute bridge', unit: 'reps', sides: LR, legHeavy: true, cap: 12,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Single-leg glute bridge', min: 5, max: 6 },
      { name: 'Single-leg glute bridge, heel further away', min: 5, max: 6 },
    ],
    howTo: [
      'Lie on your back, one foot flat near your hips, the other leg straight or held to your chest.',
      'Drive through the planted heel to lift the hips until your body is straight from knee to shoulder.',
      'Pause 2 s at the top with the pelvis level; do not let it tip.',
      'Lower slowly. Log each side separately.',
    ],
    cues: '2 s pause at the top, pelvis level. Start below your limit.',
    swaps: [
      { name: 'Glute bridge (both legs) with 3 s pause', note: 'Easier: both feet down.', sides: null },
      { name: 'Bridge march', note: 'Hold the bridge and lift one foot at a time.' },
    ],
  },
  'prone-ytw': {
    id: 'prone-ytw', name: 'Prone Y–T–W raises', unit: 'reps', sides: ['Y', 'T', 'W'], legHeavy: false, cap: 12,
    levers: ['pause', 'tempo', 'sets'],
    ladder: [{ name: 'Prone Y–T–W raises', min: 6, max: 8 }],
    howTo: [
      'Lie face down, forehead resting on a folded towel, arms long.',
      'Y: lift both arms overhead in a Y shape, thumbs up, by squeezing the shoulder blades back and down.',
      'T: arms out to the sides. W: elbows bent and pulled down towards your ribs.',
      'Small, slow lifts with no swinging. Do all reps of one shape, then the next.',
    ],
    cues: 'Slow, small, controlled shoulder-blade movement. No momentum.',
    swaps: [
      { name: 'Prone swimmers', note: 'Slide the arms from W to Y and back while hovering.', sides: null },
      { name: 'Superman hold', note: 'Lift arms and legs and hold; count reps as 3 s holds.', sides: null },
    ],
  },
  'dead-bug': {
    id: 'dead-bug', name: 'Dead bug', unit: 'reps', sides: LR, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Dead bug', min: 8, max: 10 },
      { name: 'Long-lever dead bug', min: 6, max: 8 },
    ],
    howTo: [
      'Lie on your back, arms pointing at the ceiling, hips and knees bent to 90°.',
      'Press your lower back gently into the mat and keep it there.',
      'Breathe out as you lower the opposite arm and leg towards the floor.',
      'Return and switch sides. One rep each side counts as one per side.',
    ],
    cues: 'Lower back controlled; exhale as the arm and leg extend.',
    swaps: [
      { name: 'Bird dog', note: 'On hands and knees; same opposite arm and leg pattern.' },
      { name: 'Heel taps', note: 'Easier: tap one heel down at a time, arms still.' },
    ],
  },
  'sl-rdl': {
    id: 'sl-rdl', name: 'Single-leg Romanian deadlift', unit: 'reps', sides: LR, legHeavy: true, cap: 12,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Single-leg Romanian deadlift', min: 8, max: 8 },
      { name: 'Single-leg Romanian deadlift to knee drive', min: 6, max: 8 },
    ],
    howTo: [
      'Stand on one leg with a soft knee.',
      'Hinge at the hip, reaching your hands long towards the floor while the free leg goes back.',
      'Keep the hips square to the floor. Lower over 3 s.',
      'Squeeze the standing glute to come back up. Fingertip support on a wall is fine if balance limits control.',
    ],
    cues: 'Hinge at the hip, reach long, square hips, 3 s lowering.',
    swaps: [
      { name: 'Kickstand Romanian deadlift', note: 'Back toe touches the floor for balance.' },
      { name: 'Good morning (both legs)', note: 'Easier hinge with hands on the chest.', sides: null },
    ],
  },
  'tempo-squat': {
    id: 'tempo-squat', name: 'Tempo squat', unit: 'reps', sides: null, legHeavy: true, cap: 20,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Tempo squat', min: 10, max: 12 },
      { name: 'Tempo squat, 1½ reps', min: 8, max: 10 },
      { name: 'Cossack squat', min: 5, max: 6, sides: LR },
    ],
    howTo: [
      'Feet about shoulder-width, toes slightly out.',
      'Sit down over 3 s, chest up, knees tracking over the toes.',
      'Pause 1–2 s at the bottom without bouncing.',
      'Stand up smoothly. Keep every rep crisp.',
    ],
    cues: '3 s down, 1–2 s pause, smooth ascent.',
    swaps: [
      { name: 'Pause squat', note: 'Normal speed down, 3 s pause at the bottom.' },
      { name: 'Split squat', note: 'One leg at a time, logged per leg.', sides: LR },
    ],
  },
  'pike-push-up': {
    id: 'pike-push-up', name: 'Pike push-up', unit: 'reps', sides: null, legHeavy: false, cap: 12,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Pike push-up, more upright', min: 6, max: 8 },
      { name: 'Pike push-up', min: 6, max: 8 },
      { name: 'Pike push-up, feet closer to hands', min: 5, max: 8 },
    ],
    howTo: [
      'Start in a downward-dog shape: hips high, hands shoulder-width.',
      'Bend the elbows to lower the top of your head towards the floor in front of your hands.',
      'Press back up. Use a shorter range or a more upright position if needed.',
      'Stop if you feel shoulder discomfort or form slips.',
    ],
    cues: 'Scale the range; stop on shoulder discomfort or form loss.',
    swaps: [
      { name: 'Pike shoulder taps', note: 'Hold the pike and tap one shoulder at a time.' },
      { name: 'Press-up', note: 'Back to the flat version if shoulders need a break.' },
    ],
  },
  'sl-calf-raise': {
    id: 'sl-calf-raise', name: 'Single-leg calf raise', unit: 'reps', sides: LR, legHeavy: true, cap: 20,
    levers: ['pause', 'tempo', 'sets', 'variation'],
    ladder: [
      { name: 'Single-leg calf raise', min: 10, max: 12 },
      { name: 'Single-leg bent-knee calf raise', min: 10, max: 12 },
    ],
    howTo: [
      'Stand on one foot, fingertips on a wall for balance.',
      'Rise onto the ball of the foot over 2 s as high as is comfortable.',
      'Pause at the top, then lower over 3 s.',
      'Full comfortable range every rep.',
    ],
    cues: '2 s up, 3 s down, pause at the top.',
    swaps: [
      { name: 'Double-leg slow calf raise', note: 'Both feet; 3 s up, 3 s down.', sides: null },
      { name: 'Calf raise hold', note: 'Hold the top position; count reps as 5 s holds.' },
    ],
  },
  'side-plank': {
    id: 'side-plank', name: 'Side plank', unit: 'seconds', sides: LR, legHeavy: false, cap: 60,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Side plank from knees', min: 20, max: 30 },
      { name: 'Side plank', min: 25, max: 40 },
      { name: 'Side plank with top-leg raise', min: 20, max: 30 },
    ],
    howTo: [
      'Lie on your side, elbow under the shoulder, legs stacked.',
      'Lift the hips so the body is straight from head to feet.',
      'Hold without letting the hips drop or rotate.',
      'Switch sides. Quality first; stop the clock when form goes.',
    ],
    cues: 'Hips lifted, body aligned. Progress quality, not just time.',
    swaps: [
      { name: 'Side plank from knees', note: 'Shorter lever for an easier hold.' },
      { name: 'Side-lying leg raise', note: 'Lateral hip work if the shoulder needs a rest.' },
    ],
  },
};

// Pictures for each exercise's How to. Downloaded once from their sources, resized, and stored in the app
// so they work offline. Licences were checked on each file's own page; full details in
// assets/exercises/CREDITS.md. Drawings marked "own" were made for this app.
export const BYSA3 = { license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' };
export const BYSA4 = { license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const OWN = { credit: 'drawing made for this app', own: true };
const IMAGES = {
  'reverse-lunge': { ...OWN, srcs: [{ src: 'assets/exercises/reverse-lunge.svg', w: 600, h: 300 }], alt: 'Stand tall, then step one foot back and lower until both knees bend to about 90 degrees.' },
  'press-up': {
    ...BYSA3, credit: 'Everkinetic', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Push_ups_1.svg',
    srcs: [{ src: 'assets/exercises/press-up-1.svg', w: 1200, h: 669 }, { src: 'assets/exercises/press-up-2.svg', w: 1200, h: 669 }],
    alt: 'Press-up: arms straight with the body in one line, then lowered until the chest is just off the floor.',
  },
  'sl-glute-bridge': {
    ...BYSA3, credit: 'Klewis425', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Single_Leg_Bridge.jpg', changes: 'resized',
    srcs: [{ src: 'assets/exercises/sl-glute-bridge.jpg', w: 740, h: 552 }],
    alt: 'Single-leg glute bridge: lying on the back, one foot planted, hips lifted, the other leg raised straight.',
  },
  'prone-ytw': { ...OWN, srcs: [{ src: 'assets/exercises/prone-ytw.svg', w: 600, h: 320 }], alt: 'Seen from above, lying face down: arms raised in a Y overhead, a T out to the sides, and a W with elbows bent.' },
  'dead-bug': { ...OWN, srcs: [{ src: 'assets/exercises/dead-bug.svg', w: 600, h: 300 }], alt: 'Dead bug: on the back with arms up and knees over hips, then the opposite arm and leg lowered towards the floor.' },
  'sl-rdl': {
    ...BYSA4, credit: 'Robert Lindermayr', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tuladandasana_-_Virabhadrasana_III_(cropped).jpg', changes: 'resized',
    note: 'Shown as the yoga pose Warrior III, the same single-leg hinge. Your arms can hang down instead.',
    srcs: [{ src: 'assets/exercises/sl-rdl.jpg', w: 800, h: 600 }],
    alt: 'Balancing on one leg, hinged forward at the hip with the body and back leg in a straight line.',
  },
  'tempo-squat': {
    ...BYSA4, credit: 'wger.de exercise database (AI-generated drawing)', sourceUrl: 'https://wger.de/media/exercise-images/1963/db285682-1ab3-4be0-ae00-5117ecce1ee6.png', changes: 'resized, greyscale',
    srcs: [{ src: 'assets/exercises/tempo-squat.png', w: 800, h: 581 }],
    alt: 'Bodyweight squat: standing tall, then sitting down with arms forward until the thighs are about parallel to the floor.',
  },
  'pike-push-up': {
    ...BYSA4, credit: 'wger.de exercise database (AI-generated drawing)', sourceUrl: 'https://wger.de/media/exercise-images/454/447f3c17-405f-46e0-b138-65c2a8caaab0.png', changes: 'resized, greyscale',
    srcs: [{ src: 'assets/exercises/pike-push-up.png', w: 800, h: 581 }],
    alt: 'Pike push-up: hips high in an upside-down V, then elbows bent to lower the head towards the floor.',
  },
  'sl-calf-raise': {
    ...BYSA3, credit: 'Bessieeboo', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Eccentric_Exercise.png', changes: 'converted to JPEG',
    srcs: [{ src: 'assets/exercises/sl-calf-raise.jpg', w: 459, h: 187 }],
    alt: 'Single-leg calf raise: rising onto the ball of one foot, then lowering slowly.',
  },
  'side-plank': {
    ...BYSA3, credit: 'Jaykayfit', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Side_Plank.jpg', changes: 'resized',
    srcs: [{ src: 'assets/exercises/side-plank.jpg', w: 720, h: 720 }],
    alt: 'Side plank: lying on one side on the forearm, then lifting the hips so the body is straight.',
  },
};
for (const [id, image] of Object.entries(IMAGES)) EXERCISES[id].image = image;

// Used by the benchmark screen and tests, not programmed in a session.
export const FRONT_PLANK_NOTE = 'Front plank: forearms down, body in one line, strict form. Cap the test at 2 minutes.';

const BANNED = /burpee|mountain[\s-]*climber/i;

export function isBannedName(name) {
  return BANNED.test(String(name || ''));
}
