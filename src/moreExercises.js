// More built-in exercises for the circuit editor: bodyweight only, using the floor, a wall, a sofa, a sturdy
// chair, or a sturdy step or the bottom stair (a towel only as padding). No burpees or mountain climbers, ever,
// and no plyometrics.
// Same shape as EXERCISES in library.js, plus:
// area: 'legs' | 'push' | 'back' | 'core', for grouping the add-exercise list and the balance check.
// focus: what it trains, so a like-for-like fresh exercise can be offered later.
// note: one line for the add-exercise list: what it is for and any furniture it needs.
// start: the starting prescription; min/max match the ladder rung named after the exercise.
// MORE_VARIATIONS holds the steps for every harder version and swap below that has no how-to elsewhere.

const LR = ['L', 'R'];

export const MORE_EXERCISES = {
  // Legs and hips
  'bulgarian-split-squat': {
    id: 'bulgarian-split-squat', name: 'Bulgarian split squat', unit: 'reps', sides: LR, legHeavy: true, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Bulgarian split squat', min: 8, max: 10 },
      { name: 'Bulgarian split squat, 1½ reps', min: 6, max: 8 },
    ],
    howTo: [
      'Stand a long stride in front of a sofa or chair and rest the top of your back foot on the seat.',
      'Lower for about 2 s, straight down, until your front thigh is about level with the floor.',
      'Keep the front foot flat and the front knee in line with your toes.',
      'Push through the front heel to stand. Do all reps on one leg, then switch.',
    ],
    cues: 'Most of your weight on the front leg; slow down, steady up.',
    swaps: [
      { name: 'Split squat', note: 'Back foot on the floor: easier balance, same leg work.' },
      { name: 'Reverse lunge', note: 'Stepping version if the back-foot position is uncomfortable.' },
    ],
    area: 'legs', focus: 'single-leg', note: 'Single-leg strength; back foot on a sofa or chair.',
    start: { sets: 3, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 4 },
  },
  'wall-sit': {
    id: 'wall-sit', name: 'Wall sit', unit: 'seconds', sides: null, legHeavy: true, cap: 90,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Wall sit', min: 30, max: 45 },
      { name: 'Wall sit, heels raised', min: 25, max: 40 },
      { name: 'Single-leg wall sit', min: 15, max: 25, sides: LR },
    ],
    howTo: [
      'Stand with your back flat against a wall, feet about 50 cm out in front.',
      'Slide down until your knees bend to about 90°, or stop a little higher if that is more comfortable.',
      'Knees over the ankles, weight through the heels, hands off the thighs.',
      'Hold, breathing steadily. Slide back up to finish.',
    ],
    cues: 'Back flat on the wall; knees over the ankles.',
    swaps: [
      { name: 'Wall sit, higher', note: 'Easier: hips stay a little above the knees.' },
      { name: 'Squat hold', note: 'No wall needed: hold the bottom of a squat.' },
    ],
    area: 'legs', focus: 'squat', note: 'Thigh endurance; needs a clear bit of wall.',
    start: { sets: 2, min: 30, max: 45, tempoDown: 0, pause: 0, maxSets: 3 },
  },
  'step-up': {
    id: 'step-up', name: 'Step-up', unit: 'reps', sides: LR, legHeavy: true, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Step-up', min: 8, max: 10 },
      { name: 'Step-up to knee drive', min: 8, max: 10 },
    ],
    howTo: [
      'Stand facing a sturdy step or the bottom stair and put one whole foot on it.',
      'Lean forward a little and push through that heel to stand up on the step.',
      'Bring the other foot up only lightly; the top leg does the work.',
      'Lower the back foot to the floor over about 2 s. Do all reps on one leg, then switch.',
    ],
    cues: 'Push through the top heel; lower slowly.',
    swaps: [
      { name: 'Split squat', note: 'No step needed: same single-leg work.' },
      { name: 'Lateral step-up', note: 'Sideways version; easier on the knees for some people.' },
    ],
    area: 'legs', focus: 'single-leg', note: 'Single-leg strength; a sturdy step or the bottom stair.',
    start: { sets: 3, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 4 },
  },
  'lateral-lunge': {
    id: 'lateral-lunge', name: 'Lateral lunge', unit: 'reps', sides: LR, legHeavy: true, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Lateral lunge', min: 8, max: 10 },
      { name: 'Cossack squat', min: 5, max: 8 },
    ],
    howTo: ['Stand with your feet wide.', 'Sit back and to one side, bending that knee while the other leg stays straight.', 'Keep your chest up and the bent knee over the toes.', 'Push back to the middle. All reps on one side, then switch.'],
    cues: 'Sit back into the hip; keep the straight leg straight.',
    swaps: [
      { name: 'Curtsy lunge', note: 'Steps back and across; works the side of the hip.' },
      { name: 'Reverse lunge', note: 'Straight-back version if side to side feels awkward.' },
    ],
    area: 'legs', focus: 'single-leg', note: 'Side-to-side leg strength and hip mobility; no props.',
    start: { sets: 3, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 4 },
  },
  'glute-bridge': {
    id: 'glute-bridge', name: 'Glute bridge', unit: 'reps', sides: null, legHeavy: true, cap: 20,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Glute bridge', min: 12, max: 15 },
      { name: 'Bridge march', min: 8, max: 10, sides: LR },
      { name: 'Single-leg glute bridge', min: 6, max: 8, sides: LR },
    ],
    howTo: [
      'Lie on your back, feet flat and hip-width apart, close to your hips.',
      'Drive through your heels to lift your hips until your body is straight from knees to shoulders.',
      'Squeeze your glutes and pause at the top without arching your lower back.',
      'Lower slowly over about 2 s.',
    ],
    cues: 'Push through the heels; ribs down, squeeze at the top.',
    swaps: [
      { name: 'Glute bridge (both legs) with 3 s pause', note: 'Longer squeeze at the top: fewer reps feel harder.' },
      { name: 'Frog bridge', note: 'Soles together, knees out: more glute, less thigh.' },
    ],
    area: 'legs', focus: 'glutes', note: 'Glutes with both legs; floor only.',
    start: { sets: 3, min: 12, max: 15, tempoDown: 2, pause: 1, maxSets: 4 },
  },
  'hip-thrust': {
    id: 'hip-thrust', name: 'Hip thrust', unit: 'reps', sides: null, legHeavy: true, cap: 20,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Hip thrust', min: 10, max: 12 },
      { name: 'Single-leg hip thrust', min: 6, max: 8, sides: LR },
    ],
    howTo: [
      'Sit on the floor with your shoulder blades against the edge of a sofa that cannot slide, feet flat and hip-width apart.',
      'Drive through your heels to lift your hips until your body is flat from knees to shoulders.',
      'Chin tucked, ribs down; squeeze your glutes and pause at the top.',
      'Lower over about 2 s until your hips nearly touch the floor.',
    ],
    cues: 'Shins upright at the top; ribs down, squeeze the glutes.',
    swaps: [
      { name: 'Glute bridge', note: 'Floor version if no sofa is handy.' },
      { name: 'Glute bridge (both legs) with 3 s pause', note: 'Floor version with a long squeeze at the top.' },
    ],
    area: 'legs', focus: 'glutes', note: 'Glutes through a bigger range; shoulders on a sofa edge.',
    start: { sets: 3, min: 10, max: 12, tempoDown: 2, pause: 1, maxSets: 4 },
  },
  'tibialis-raise': {
    id: 'tibialis-raise', name: 'Tibialis raise', unit: 'reps', sides: null, legHeavy: true, cap: 25,
    levers: ['pause', 'tempo', 'sets', 'variation'],
    ladder: [
      { name: 'Tibialis raise', min: 12, max: 15 },
      { name: 'Tibialis raise, heels further out', min: 10, max: 12 },
      { name: 'Single-leg tibialis raise', min: 8, max: 10, sides: LR },
    ],
    howTo: [
      'Stand with your back and bottom against a wall, heels about a foot length out from it.',
      'Keep your legs straight and lift your toes and the balls of your feet as high as you can.',
      'Pause at the top, then lower over about 2 s.',
      'Heels stay down the whole time. You should feel it in the front of the shins.',
    ],
    cues: 'Toes up high; slow on the way down.',
    swaps: [
      { name: 'Seated toe raise', note: 'Easier: sitting on a chair.' },
      { name: 'Heel walk', note: 'Walking slowly on your heels; count the steps.' },
    ],
    area: 'legs', focus: 'shins', note: 'Front of the shins; back against a wall.',
    start: { sets: 2, min: 12, max: 15, tempoDown: 2, pause: 1, maxSets: 3 },
  },

  // Push and arms
  'decline-press-up': {
    id: 'decline-press-up', name: 'Decline press-up', unit: 'reps', sides: null, legHeavy: false, cap: 20,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Decline press-up', min: 6, max: 10 },
      { name: 'Decline close-grip press-up', min: 5, max: 8 },
    ],
    howTo: [
      'Put your feet on a sofa or sturdy step and your hands on the floor, just wider than your shoulders.',
      'Body in one straight line from head to heels.',
      'Lower for about 2 s until your chest is a fist off the floor, elbows about 45° from your sides.',
      'Press back up without letting the hips sag. Stop before form breaks.',
    ],
    cues: 'Body in one line; about 2 s down.',
    swaps: [
      { name: 'Press-up', note: 'Flat version: same movement, a bit easier.' },
      { name: 'Tempo press-up', note: 'Flat, with a slow 4 s lowering.' },
    ],
    area: 'push', focus: 'chest', note: 'Chest and shoulders; feet on a sofa or step.',
    start: { sets: 3, min: 6, max: 10, tempoDown: 2, pause: 0, maxSets: 4 },
  },
  'diamond-press-up': {
    id: 'diamond-press-up', name: 'Diamond press-up', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Diamond press-up', min: 6, max: 10 },
      { name: 'Decline diamond press-up', min: 5, max: 8 },
    ],
    howTo: [
      'Place your hands under your chest, thumbs and index fingers touching to make a diamond.',
      'Walk your feet back so your body is in one straight line.',
      'Lower for about 2 s, elbows close to your sides, until your chest nears your hands.',
      'Press back up. Ease off if your wrists or elbows complain.',
    ],
    cues: 'Elbows back, not out; body in one line.',
    swaps: [
      { name: 'Close-grip press-up', note: 'Hands a little wider: easier on the wrists.' },
      { name: 'Knee diamond press-up', note: 'Same movement from the knees.' },
    ],
    area: 'push', focus: 'triceps', note: 'Press-up that works the backs of the arms; floor only.',
    start: { sets: 3, min: 6, max: 10, tempoDown: 2, pause: 0, maxSets: 4 },
  },
  'sphinx-press-up': {
    id: 'sphinx-press-up', name: 'Sphinx press-up', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Sphinx press-up', min: 6, max: 10 },
      { name: 'Sphinx press-up, elbows further forward', min: 5, max: 8 },
    ],
    howTo: [
      'Start in a forearm plank, elbows under your shoulders, palms flat, body in one line.',
      'Press through your palms to straighten your arms and lift your forearms off the floor.',
      'Lower back onto your forearms over about 2 s.',
      'Keep your hips level the whole time; a folded towel under the elbows helps.',
    ],
    cues: 'Hips steady; push through the palms.',
    swaps: [
      { name: 'Sphinx press-up from knees', note: 'Same movement from the knees.' },
      { name: 'Close-grip press-up', note: 'Backs of the arms with a more familiar movement.' },
    ],
    area: 'push', focus: 'triceps', note: 'Backs of the arms; forearm plank to straight arms and back.',
    start: { sets: 2, min: 6, max: 10, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'chair-dips': {
    id: 'chair-dips', name: 'Chair dips', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Chair dips', min: 8, max: 10 },
      { name: 'Chair dips, feet raised', min: 6, max: 8 },
    ],
    howTo: [
      'Push a sturdy chair back against a wall so it cannot slide. Sit on the front edge, hands gripping beside your hips.',
      'Walk your feet out with your legs nearly straight and slide your hips just off the seat.',
      'Bend your elbows straight back to lower for about 2 s, only as far as is comfortable, then press up.',
      'Keep your shoulders down and back. Stop if the front of your shoulder hurts.',
    ],
    cues: 'Elbows back, shoulders down; stop if the front of the shoulder hurts.',
    swaps: [
      { name: 'Bent-knee chair dips', note: 'Easier: knees bent, feet closer, legs help.' },
      { name: 'Close-grip press-up', note: 'Backs of the arms without the dip position, if your shoulders prefer it.' },
    ],
    area: 'push', focus: 'triceps', note: 'Backs of the arms; a sturdy chair against a wall so it cannot slide.',
    start: { sets: 2, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'elevated-pike-push-up': {
    id: 'elevated-pike-push-up', name: 'Elevated pike push-up', unit: 'reps', sides: null, legHeavy: false, cap: 12,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Elevated pike push-up', min: 5, max: 8 },
      { name: 'Elevated pike push-up, hands closer in', min: 4, max: 6 },
    ],
    howTo: [
      'Put your feet on a sofa or sturdy step and walk your hands back until your hips are high, body like an upside-down L.',
      'Hands shoulder-width, head between your arms.',
      'Bend your elbows to lower the top of your head towards the floor in front of your hands over about 2 s.',
      'Press back up. Use a shorter range if needed, and stop if you feel shoulder discomfort.',
    ],
    cues: 'Hips high, head in front of the hands; stop on shoulder discomfort.',
    swaps: [
      { name: 'Pike push-up', note: 'Feet on the floor: an easier angle.' },
      { name: 'Pike shoulder taps', note: 'Hold the pike and tap one shoulder at a time.' },
    ],
    area: 'push', focus: 'shoulders', note: 'Shoulders, harder than a pike push-up; feet on a sofa or step.',
    start: { sets: 2, min: 5, max: 8, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'plank-to-down-dog': {
    id: 'plank-to-down-dog', name: 'Plank to downward dog', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Plank to downward dog', min: 8, max: 10 },
      { name: 'Plank to downward dog, one leg raised', min: 6, max: 8, sides: LR },
    ],
    howTo: [
      'Start in a high plank: hands under your shoulders, body in one line.',
      'Push the floor away and lift your hips up and back into a downward dog.',
      'Pause, letting your heels sink towards the floor.',
      'Lower back to the plank over about 2 s without letting the hips sag.',
    ],
    cues: 'Push the floor away; smooth both ways.',
    swaps: [
      { name: 'Pike shoulder taps', note: 'Hold the downward dog and tap one shoulder at a time.' },
      { name: 'Plank shoulder taps', note: 'Plank version for the shoulders and trunk.', sides: LR },
    ],
    area: 'push', focus: 'shoulders', note: 'Shoulders and trunk, with a hamstring stretch; floor only.',
    start: { sets: 2, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'bear-crawl': {
    id: 'bear-crawl', name: 'Bear crawl', unit: 'seconds', sides: null, legHeavy: false, cap: 60,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Bear crawl', min: 20, max: 30 },
      { name: 'Lateral bear crawl', min: 20, max: 30 },
    ],
    howTo: [
      'On hands and toes, hands under your shoulders, knees bent and hovering a few centimetres off the floor.',
      'Crawl forwards a few small steps, moving the opposite hand and foot together.',
      'Then crawl backwards to where you started.',
      'Keep your back flat and hips low. Stop the clock when your knees touch or form slips.',
    ],
    cues: 'Knees just off the floor; small steps, back flat.',
    swaps: [
      { name: 'Bear plank hold', note: 'Same position held still: no floor space needed.' },
      { name: 'Bear shoulder taps', note: 'Stay in place and tap one shoulder at a time.' },
    ],
    area: 'push', focus: 'shoulders', note: 'Shoulders and trunk; a couple of metres of clear floor.',
    start: { sets: 2, min: 20, max: 30, tempoDown: 0, pause: 0, maxSets: 3 },
  },

  // Upper back
  'wall-slides': {
    id: 'wall-slides', name: 'Wall slides', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Wall slides', min: 8, max: 10 },
      { name: 'Wall slides with lift-off', min: 6, max: 8 },
    ],
    howTo: [
      'Stand with your back, head and bottom against a wall, feet a little in front.',
      'Raise your arms into a W: elbows bent, backs of the forearms and hands against the wall.',
      'Slide your arms slowly up the wall as far as you can while keeping contact, then pull them back down to the W.',
      'Keep your ribs down and your lower back gently against the wall. Comfortable range only.',
    ],
    cues: 'Ribs down; slow slide, shoulders away from the ears.',
    swaps: [
      { name: 'Floor slides', note: 'Lying on your back: easier to keep contact.' },
      { name: 'Prone swimmers', note: 'Face-down version for the same shoulder-blade muscles.' },
    ],
    area: 'back', focus: 'shoulder-blades', note: 'Shoulder-blade control and posture; a clear bit of wall.',
    start: { sets: 2, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'scapular-press-up': {
    id: 'scapular-press-up', name: 'Scapular press-up', unit: 'reps', sides: null, legHeavy: false, cap: 20,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Scapular press-up', min: 10, max: 12 },
      { name: 'Scapular press-up, feet raised', min: 8, max: 10 },
    ],
    howTo: [
      'Start in a high plank, hands under your shoulders, arms straight.',
      'Keeping your arms straight, let your chest sink so your shoulder blades squeeze together.',
      'Push the floor away so your shoulder blades spread apart and your upper back rounds slightly.',
      'Small, slow movement; the elbows never bend.',
    ],
    cues: 'Arms straight; move only the shoulder blades.',
    swaps: [
      { name: 'Knee scapular press-up', note: 'Same movement from the knees.' },
      { name: 'Wall slides', note: 'Standing shoulder-blade work against a wall.' },
    ],
    area: 'back', focus: 'shoulder-blades', note: 'Shoulder-blade strength in a plank; floor only.',
    start: { sets: 2, min: 10, max: 12, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'reverse-snow-angels': {
    id: 'reverse-snow-angels', name: 'Reverse snow angels', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Reverse snow angels', min: 8, max: 10 },
      { name: 'Reverse snow angels, chest lifted', min: 6, max: 8 },
    ],
    howTo: [
      'Lie face down, forehead resting on a folded towel, arms by your sides, palms down.',
      'Lift your arms just off the floor by squeezing your shoulder blades back and down.',
      'Keeping them straight and hovering, sweep them out wide and round until they are overhead.',
      'Sweep back to your hips. Slow and smooth; keep your shoulders away from your ears.',
    ],
    cues: 'Arms hover the whole time; slow sweep.',
    swaps: [
      { name: 'Prone swimmers', note: 'Same sweep with a bend at the elbows near the hips.' },
      { name: 'Prone T raise', note: 'Simpler: lift straight arms out to the sides.' },
    ],
    area: 'back', focus: 'upper-back', note: 'Upper back, lying face down; a towel for your forehead.',
    start: { sets: 2, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'prone-swimmers': {
    id: 'prone-swimmers', name: 'Prone swimmers', unit: 'reps', sides: null, legHeavy: false, cap: 15,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Prone swimmers', min: 8, max: 10 },
      { name: 'Prone swimmers, chest lifted', min: 6, max: 8 },
    ],
    howTo: ['Lie face down, forehead on a folded towel, arms overhead hovering just off the floor.', 'Sweep your arms round and down until your hands reach your lower back, bending your elbows at the end.', 'Sweep them back overhead.', 'Small, slow movements; keep your shoulders away from your ears.'],
    cues: 'Hover the whole time; no swinging.',
    swaps: [
      { name: 'Reverse snow angels', note: 'Straight-arm version of the same sweep.' },
      { name: 'Superman hold', note: 'Lift arms and legs and hold; count reps as 3 s holds.' },
    ],
    area: 'back', focus: 'upper-back', note: 'Upper back and shoulder-blade control, lying face down.',
    start: { sets: 2, min: 8, max: 10, tempoDown: 2, pause: 0, maxSets: 3 },
  },
  'reverse-plank': {
    id: 'reverse-plank', name: 'Reverse plank', unit: 'seconds', sides: null, legHeavy: false, cap: 60,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Reverse tabletop hold', min: 20, max: 30 },
      { name: 'Reverse plank', min: 20, max: 30 },
      { name: 'Reverse plank with leg raise', min: 15, max: 20, sides: LR },
    ],
    howTo: [
      'Sit with your legs straight out and your hands on the floor behind your hips, fingers pointing towards your feet.',
      'Press through your hands and heels to lift your hips until your body is straight from head to heels.',
      'Squeeze your shoulder blades together and keep your chest open.',
      'Hold, then lower. Turn the fingers out to the sides if your wrists complain.',
    ],
    cues: 'Hips high, chest open; shoulders down.',
    swaps: [
      { name: 'Reverse tabletop hold', note: 'Easier: knees bent, feet flat.' },
      { name: 'Prone T hold', note: 'Face-down hold for the same upper-back muscles.' },
    ],
    area: 'back', focus: 'upper-back', note: 'Upper back, shoulders and glutes, hands behind you; floor only.',
    start: { sets: 2, min: 20, max: 30, tempoDown: 0, pause: 0, maxSets: 3 },
  },

  // Core
  'front-plank': {
    id: 'front-plank', name: 'Front plank', unit: 'seconds', sides: null, legHeavy: false, cap: 90,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Front plank', min: 30, max: 45 },
      { name: 'Front plank, alternating leg lifts', min: 25, max: 40 },
      { name: 'Long-lever plank', min: 20, max: 30 },
    ],
    howTo: [
      'Forearms on the floor, elbows under your shoulders.',
      'Step your feet back so your body is in one straight line from head to heels.',
      'Squeeze your glutes and brace your stomach gently.',
      'Hold, breathing steadily. Stop the clock when your hips sag or lift.',
    ],
    cues: 'One straight line; breathe steadily.',
    swaps: [
      { name: 'Front plank from knees', note: 'Shorter lever for an easier hold.' },
      { name: 'Bear plank hold', note: 'Hands and toes with the knees hovering.' },
    ],
    area: 'core', focus: 'front-core', note: 'Front core hold; floor only.',
    start: { sets: 2, min: 30, max: 45, tempoDown: 0, pause: 0, maxSets: 3 },
  },
  'hollow-hold': {
    id: 'hollow-hold', name: 'Hollow hold', unit: 'seconds', sides: null, legHeavy: false, cap: 60,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Tuck hollow hold', min: 20, max: 30 },
      { name: 'Hollow hold', min: 20, max: 30 },
      { name: 'Hollow hold, arms overhead', min: 15, max: 25 },
    ],
    howTo: [
      'Lie on your back and press your lower back gently into the floor.',
      'Lift your head and shoulders, reach your arms towards your feet, and lift your straight legs a little off the floor.',
      'Keep your lower back down; raise your legs higher if it starts to lift.',
      'Hold, breathing steadily. Stop the clock when your back arches.',
    ],
    cues: 'Lower back down; legs higher if it lifts.',
    swaps: [
      { name: 'Tuck hollow hold', note: 'Knees bent for an easier hold.' },
      { name: 'Front plank', note: 'Face-down hold for the same front-core work.' },
    ],
    area: 'core', focus: 'front-core', note: 'Front core hold lying on your back; floor only.',
    start: { sets: 2, min: 20, max: 30, tempoDown: 0, pause: 0, maxSets: 3 },
  },
  'bear-plank-hold': {
    id: 'bear-plank-hold', name: 'Bear plank hold', unit: 'seconds', sides: null, legHeavy: false, cap: 60,
    levers: ['variation', 'sets'],
    ladder: [
      { name: 'Bear plank hold', min: 25, max: 40 },
      { name: 'Bear shoulder taps', min: 20, max: 30 },
      { name: 'Bear plank, opposite arm and leg lift', min: 20, max: 30 },
    ],
    howTo: [
      'On hands and knees, hands under your shoulders and knees under your hips.',
      'Tuck your toes and lift your knees a few centimetres off the floor.',
      'Keep your back flat, as if balancing a cup on it.',
      'Hold, breathing steadily. Lower the knees when your back rounds or hips lift.',
    ],
    cues: 'Knees just off the floor; flat back.',
    swaps: [
      { name: 'Front plank', note: 'Forearms and toes instead.' },
      { name: 'Front plank from knees', note: 'Easier hold from the knees.' },
    ],
    area: 'core', focus: 'front-core', note: 'Front core and shoulders; floor only.',
    start: { sets: 2, min: 25, max: 40, tempoDown: 0, pause: 0, maxSets: 3 },
  },
  'reverse-crunch': {
    id: 'reverse-crunch', name: 'Reverse crunch', unit: 'reps', sides: null, legHeavy: false, cap: 20,
    levers: ['tempo', 'pause', 'variation', 'sets'],
    ladder: [
      { name: 'Reverse crunch', min: 10, max: 12 },
      { name: 'Lying leg raise', min: 8, max: 10 },
    ],
    howTo: [
      'Lie on your back, hands by your sides, knees bent to 90° over your hips.',
      'Breathe out and curl your hips off the floor, bringing your knees towards your chest.',
      'Lower your hips back down slowly, over about 2 s.',
      'Use your stomach, not a swing of the legs.',
    ],
    cues: 'Curl, do not swing; slow on the way down.',
    swaps: [
      { name: 'Dead bug', note: 'Opposite arm and leg; gentler on the back.', sides: LR },
      { name: 'Heel taps', note: 'Easier: tap one heel down at a time.', sides: LR },
    ],
    area: 'core', focus: 'front-core', note: 'Lower stomach; floor only.',
    start: { sets: 3, min: 10, max: 12, tempoDown: 2, pause: 0, maxSets: 4 },
  },
  'bird-dog': {
    id: 'bird-dog', name: 'Bird dog', unit: 'reps', sides: LR, legHeavy: false, cap: 15,
    levers: ['pause', 'tempo', 'variation', 'sets'],
    ladder: [
      { name: 'Bird dog', min: 8, max: 10 },
      { name: 'Bird dog with elbow-to-knee crunch', min: 8, max: 10 },
      { name: 'Bird dog, knees hovering', min: 6, max: 8 },
    ],
    howTo: ['On hands and knees: hands under shoulders, knees under hips.', 'Reach one arm forward and the opposite leg back until both are level with your body.', 'Pause 2 s without twisting your hips.', 'Return and switch.'],
    cues: 'Hips square to the floor; long, not high.',
    swaps: [
      { name: 'Dead bug', note: 'On your back; same opposite arm and leg pattern.' },
      { name: 'Bird dog, leg only', note: 'Easier: both hands stay down.' },
    ],
    area: 'core', focus: 'anti-rotation', note: 'Trunk control against twisting; floor only.',
    start: { sets: 3, min: 8, max: 10, tempoDown: 0, pause: 2, maxSets: 4 },
  },
  'plank-shoulder-taps': {
    id: 'plank-shoulder-taps', name: 'Plank shoulder taps', unit: 'reps', sides: LR, legHeavy: false, cap: 20,
    levers: ['pause', 'variation', 'sets'],
    ladder: [
      { name: 'Plank shoulder taps', min: 8, max: 10 },
      { name: 'Plank shoulder taps, feet together', min: 8, max: 10 },
    ],
    howTo: [
      'Start in a high plank, hands under your shoulders, feet a little wider than your hips.',
      'Lift one hand and tap the opposite shoulder.',
      'Put it down and switch, keeping your hips as still as you can.',
      'Each tap counts as one per side. Widen your feet if your hips rock.',
    ],
    cues: 'Hips still; slow, deliberate taps.',
    swaps: [
      { name: 'Knee plank shoulder taps', note: 'Same taps from the knees.' },
      { name: 'Bird dog', note: 'On hands and knees; same work against twisting.' },
    ],
    area: 'core', focus: 'anti-rotation', note: 'Trunk control against twisting, in a plank; floor only.',
    start: { sets: 3, min: 8, max: 10, tempoDown: 0, pause: 0, maxSets: 4 },
  },
};

// Steps for each harder version and swap above that is not already in VARIATIONS (routines.js) and is not
// itself an exercise's name.
export const MORE_VARIATIONS = {
  'Bulgarian split squat, 1½ reps': {
    howTo: ['Set up with your back foot on a sofa or chair.', 'Lower to the bottom over about 2 s, rise halfway, then lower to the bottom again.', 'Stand all the way up. That is one rep.', 'All reps on one leg, then switch.'],
    cues: 'Smooth and controlled; the half rep counts.',
  },
  'Wall sit, heels raised': {
    howTo: ['Set up a normal wall sit, back flat on the wall.', 'Rise onto the balls of both feet and stay there.', 'Keep your knees over your toes and your back on the wall.', 'Lower the heels and slide up to finish. Drop the heels early if your calves cramp.'],
    cues: 'High on the toes; still hold.',
  },
  'Single-leg wall sit': {
    howTo: ['Set up a normal wall sit with your feet close together.', 'Shift your weight onto one foot and lift the other a few centimetres off the floor.', 'Hold with the standing knee in line with the toes.', 'Put the foot down, then do the other leg. Sit a little higher if you cannot hold the time.'],
    cues: 'Hips level; standing knee steady.',
  },
  'Wall sit, higher': {
    howTo: ['Stand with your back flat against a wall, feet a little in front.', 'Slide down only until your hips are a bit above your knees.', 'Weight through the heels, knees over the ankles.', 'Hold, then slide back up. Go lower as it gets easier.'],
    cues: 'Shorter bend; same steady hold.',
  },
  'Squat hold': {
    howTo: ['Feet about shoulder-width, toes slightly out.', 'Sit down into a squat to a comfortable depth, arms reaching forward for balance.', 'Chest up, knees tracking over the toes, weight through the whole foot.', 'Hold, then stand up smoothly. Fingertips on a chair are fine for balance.'],
    cues: 'Still and upright; comfortable depth.',
  },
  'Step-up to knee drive': {
    howTo: ['Put one foot on a sturdy step or the bottom stair.', 'Push through that heel to stand up on the step.', 'As you rise, bring the other knee up to hip height and balance for a moment.', 'Lower that foot back to the floor slowly. All reps on one leg, then switch.'],
    cues: 'Stand tall at the top; balance before you lower.',
  },
  'Lateral step-up': {
    howTo: ['Stand side-on to a sturdy step or the bottom stair, with the near foot on it.', 'Push through that heel to stand up on the step.', 'Touch the other foot on the step only lightly.', 'Lower slowly to the floor. All reps on one leg, then switch.'],
    cues: 'Top knee over the toes; slow on the way down.',
  },
  'Curtsy lunge': {
    howTo: ['Stand tall with feet hip-width apart.', 'Step one foot back and across behind the other, as if curtsying.', 'Lower slowly until the front knee bends to about 90°, front knee over the toes.', 'Push through the front heel to stand. All reps on one side, then switch.'],
    cues: 'Hips face forward; comfortable range.',
  },
  'Frog bridge': {
    howTo: ['Lie on your back with the soles of your feet together and your knees falling out to the sides.', 'Pull your heels in towards your hips.', 'Push through the outside edges of your feet to lift your hips, squeezing your glutes.', 'Pause at the top, then lower slowly. Keep the range comfortable.'],
    cues: 'Knees wide; squeeze at the top.',
  },
  'Single-leg hip thrust': {
    howTo: ['Set up as for a hip thrust, shoulder blades on the edge of a sofa that cannot slide.', 'Lift one foot and hold that knee towards your chest.', 'Drive through the planted heel to lift your hips, keeping them level.', 'Lower slowly. All reps on one side, then switch.'],
    cues: 'Pelvis level; push through the heel.',
  },
  'Tibialis raise, heels further out': {
    howTo: ['Stand with your back against a wall, heels further out than usual.', 'Lean back into the wall with your legs straight.', 'Lift your toes as high as you can, pause, then lower over about 2 s.', 'The further out the heels, the harder it gets.'],
    cues: 'Back on the wall; full lift every rep.',
  },
  'Single-leg tibialis raise': {
    howTo: ['Stand with your back against a wall, heels a short step out.', 'Lift one foot just off the floor.', 'Lift the toes of the standing foot as high as you can, pause, then lower over about 2 s.', 'All reps on one leg, then switch.'],
    cues: 'Hips still; slow and full range.',
  },
  'Seated toe raise': {
    howTo: ['Sit on a sturdy chair, feet flat and knees bent to about 90°.', 'Keep your heels down and lift your toes as high as you can.', 'Pause at the top.', 'Lower slowly. Slide your feet further forward to make it harder.'],
    cues: 'Heels stay down; full lift.',
  },
  'Heel walk': {
    howTo: ['Stand tall and lift your toes and the balls of your feet off the floor.', 'Walk slowly forwards on your heels.', 'Keep your toes up the whole time and take small steps.', 'Each step counts as one rep. Turn round when you need to.'],
    cues: 'Toes high; small, steady steps.',
  },
  'Decline close-grip press-up': {
    howTo: ['Feet on a sofa or sturdy step, hands under your shoulders or a little narrower.', 'Body in one straight line.', 'Lower for about 2 s with your elbows close to your sides.', 'Press back up. Fewer reps than a normal decline press-up is expected.'],
    cues: 'Elbows brush your sides; hips stay up.',
  },
  'Decline diamond press-up': {
    howTo: ['Feet on a sofa or sturdy step, hands in a diamond on the floor under your chest.', 'Body in one straight line.', 'Lower for about 2 s, elbows close to your sides.', 'Press back up. Stop before your hips sag.'],
    cues: 'Hips up; elbows back.',
  },
  'Knee diamond press-up': {
    howTo: ['Kneel with your hands in a diamond under your chest, body straight from knees to head.', 'Lower for about 2 s, elbows close to your sides.', 'Press back up without bending at the hips.', 'Move back to full diamond press-ups when these get easy.'],
    cues: 'Straight line from knees to head.',
  },
  'Sphinx press-up, elbows further forward': {
    howTo: ['Start in a forearm plank with your elbows a few centimetres in front of your shoulders.', 'Press through your palms to straighten your arms.', 'Lower back onto your forearms over about 2 s.', 'The further forward the elbows, the harder it is. Keep the hips level.'],
    cues: 'Elbows ahead of the shoulders; slow down.',
  },
  'Sphinx press-up from knees': {
    howTo: ['Start in a forearm plank on your knees, body straight from knees to head.', 'Press through your palms to straighten your arms.', 'Lower back onto your forearms over about 2 s.', 'Move to the full version when these get easy.'],
    cues: 'Straight line from knees to head.',
  },
  'Chair dips, feet raised': {
    howTo: ['Set a sturdy chair against a wall and put your heels on a sofa or sturdy step in front of it.', 'Hands on the front edge of the chair, hips just off the seat.', 'Lower for about 2 s, elbows bending straight back, to a comfortable depth, then press up.', 'Stop if the front of your shoulder hurts.'],
    cues: 'Short, controlled range; shoulders down.',
  },
  'Bent-knee chair dips': {
    howTo: ['Set a sturdy chair against a wall and sit on the front edge, hands beside your hips.', 'Feet flat on the floor with your knees bent to about 90°, hips just off the seat.', 'Lower for about 2 s, elbows bending straight back, then press up.', 'Push a little through your feet if you need help. Stop if the front of your shoulder hurts.'],
    cues: 'Legs help as needed; shoulders down.',
  },
  'Elevated pike push-up, hands closer in': {
    howTo: ['Feet on a sofa or sturdy step, hands walked closer to it so your hips sit over your shoulders.', 'Bend your elbows to lower your head towards the floor in front of your hands.', 'Press back up.', 'Harder on the shoulders: stop if they hurt or form slips.'],
    cues: 'Hips stacked high; controlled range.',
  },
  'Plank to downward dog, one leg raised': {
    howTo: ['Start in a high plank.', 'Lift your hips into a downward dog and raise one leg in line with your body.', 'Pause, then lower back to the plank with the leg still lifted.', 'All reps on one side, then switch.'],
    cues: 'Hips square; leg long.',
  },
  'Lateral bear crawl': {
    howTo: ['Set up in a bear position: hands under shoulders, knees hovering just off the floor.', 'Crawl sideways a few small steps, moving one hand and foot, then the other.', 'Crawl back the other way.', 'Keep your hips low and level the whole time.'],
    cues: 'Hips low and level; small steps.',
  },
  'Bear shoulder taps': {
    howTo: ['Hold a bear position: on hands and toes with your knees hovering just off the floor.', 'Lift one hand and tap the opposite shoulder.', 'Put it down and switch, keeping your hips still.', 'Keep tapping slowly for the time.'],
    cues: 'Hips still; knees just off the floor.',
  },
  'Wall slides with lift-off': {
    howTo: ['Do a wall slide up to the top position.', 'Lift your hands a few centimetres off the wall and hold for a moment.', 'Put them back on the wall and slide down to the W.', 'Keep your ribs down; lift only as far as you can without arching.'],
    cues: 'Small lift; no arching.',
  },
  'Floor slides': {
    howTo: ['Lie on your back, knees bent, feet flat.', 'Put your arms in a W on the floor, backs of the hands touching it.', 'Slide your arms overhead as far as you can while keeping contact, then back down.', 'Keep your lower back gently on the floor.'],
    cues: 'Slow slide; keep contact.',
  },
  'Scapular press-up, feet raised': {
    howTo: ['Start in a high plank with your feet on a sofa or sturdy step.', 'Arms straight; let your chest sink so your shoulder blades squeeze together.', 'Push the floor away so they spread apart.', 'Small, slow movement; keep your hips level.'],
    cues: 'Arms straight; hips stay up.',
  },
  'Knee scapular press-up': {
    howTo: ['Start in a plank on your knees, hands under your shoulders.', 'Arms straight; let your chest sink so your shoulder blades squeeze together.', 'Push the floor away so they spread apart.', 'Small, slow movement; the elbows never bend.'],
    cues: 'Arms straight; move only the shoulder blades.',
  },
  'Reverse snow angels, chest lifted': {
    howTo: ['Lie face down, arms by your sides.', 'Lift your chest a few centimetres off the floor and hold it there.', 'Sweep your hovering arms from your hips round to overhead and back.', 'Look at the floor, not forward. Lower the chest between sets.'],
    cues: 'Chest up, neck long; slow sweep.',
  },
  'Prone T raise': {
    howTo: ['Lie face down, forehead on a folded towel, arms straight out to the sides in a T, thumbs up.', 'Squeeze your shoulder blades together to lift your arms a few centimetres.', 'Pause for a moment at the top.', 'Lower slowly. Small lifts, no swinging.'],
    cues: 'Squeeze the shoulder blades; small lift.',
  },
  'Prone swimmers, chest lifted': {
    howTo: ['Lie face down, arms overhead.', 'Lift your chest a few centimetres off the floor and hold it there.', 'Sweep your hovering arms down to your lower back, bending your elbows at the end, then back overhead.', 'Look at the floor, not forward. Lower the chest between sets.'],
    cues: 'Chest up, neck long; no swinging.',
  },
  'Reverse tabletop hold': {
    howTo: ['Sit with your knees bent, feet flat, hands on the floor behind you.', 'Press up to lift your hips until your body is flat from knees to shoulders, like a table.', 'Squeeze your shoulder blades together and keep your chest open.', 'Hold, then lower.'],
    cues: 'Flat like a table; shoulders down.',
  },
  'Reverse plank with leg raise': {
    howTo: ['Lift into a reverse plank.', 'Raise one straight leg 20–30 cm and hold it there.', 'Keep your hips high and level.', 'Switch sides. Drop the leg before your hips drop.'],
    cues: 'Hips high and level.',
  },
  'Prone T hold': {
    howTo: ['Lie face down, forehead on a folded towel, arms straight out to the sides in a T, thumbs up.', 'Squeeze your shoulder blades together to lift your arms a few centimetres.', 'Hold them there, breathing steadily.', 'Lower slowly at the end of the time.'],
    cues: 'Small lift; shoulders away from the ears.',
  },
  'Front plank, alternating leg lifts': {
    howTo: ['Hold a front plank.', 'Lift one foot a few centimetres off the floor for 2–3 s, then put it down.', 'Switch legs and keep alternating for the time.', 'Keep your hips level; do not let them twist.'],
    cues: 'Hips square; small lifts.',
  },
  'Long-lever plank': {
    howTo: ['Set up a front plank, then walk your elbows 5–10 cm further forward than your shoulders.', 'Body in one straight line, glutes squeezed.', 'Hold, breathing steadily.', 'Harder than it looks: bring the elbows back if your lower back aches.'],
    cues: 'Elbows ahead; no sag.',
  },
  'Front plank from knees': {
    howTo: ['Forearms on the floor, elbows under your shoulders, knees down.', 'Body straight from knees to head.', 'Brace gently and hold.', 'Move to full planks when these get easy.'],
    cues: 'Straight line from knees to head.',
  },
  'Tuck hollow hold': {
    howTo: ['Lie on your back, lower back pressed gently into the floor.', 'Lift your head and shoulders and bring your knees in over your hips, shins level.', 'Reach your arms towards your feet.', 'Hold, breathing steadily.'],
    cues: 'Lower back stays down.',
  },
  'Hollow hold, arms overhead': {
    howTo: ['Lie on your back, lower back pressed gently into the floor.', 'Lift your head, shoulders and straight legs a little off the floor.', 'Reach your arms overhead, upper arms by your ears.', 'Hold. Bring the arms forward again before your back arches.'],
    cues: 'Long shape; lower back down.',
  },
  'Bear plank, opposite arm and leg lift': {
    howTo: ['Hold a bear plank: knees hovering, back flat.', 'Lift one hand and the opposite foot a few centimetres off the floor for 2–3 s.', 'Put them down and switch.', 'Keep alternating for the time without twisting your hips.'],
    cues: 'Hips still; small lifts.',
  },
  'Lying leg raise': {
    howTo: ['Lie on your back, hands by your sides, legs straight.', 'Press your lower back gently into the floor.', 'Raise your straight legs until they point at the ceiling, then lower them over about 3 s.', 'Stop lowering before your back starts to arch; bend the knees a little if needed.'],
    cues: 'Lower back down; slow lowering.',
  },
  'Bird dog with elbow-to-knee crunch': {
    howTo: ['On hands and knees, reach one arm forward and the opposite leg back.', 'Bring that elbow and knee together under your body.', 'Reach out long again and pause for a moment.', 'All reps on one side, then switch.'],
    cues: 'Slow in and out; hips stay square.',
  },
  'Bird dog, knees hovering': {
    howTo: ['On hands and toes, knees a few centimetres off the floor, back flat.', 'Slowly reach one arm forward and slide the opposite leg back.', 'Pause, then return, keeping the knees off the floor.', 'Switch sides. Small reaches are fine at first.'],
    cues: 'Hips still; knees hover.',
  },
  'Bird dog, leg only': {
    howTo: ['On hands and knees: hands under shoulders, knees under hips.', 'Slide one leg back and lift it level with your body, both hands staying down.', 'Pause 2 s without twisting your hips.', 'Return and switch.'],
    cues: 'Hips square; long, not high.',
  },
  'Plank shoulder taps, feet together': {
    howTo: ['Start in a high plank with your feet together.', 'Lift one hand and tap the opposite shoulder.', 'Put it down and switch, keeping your hips still.', 'Harder to stay steady: slow down rather than rock.'],
    cues: 'Hips still; slow taps.',
  },
  'Knee plank shoulder taps': {
    howTo: ['Start in a high plank on your knees, hands under your shoulders.', 'Lift one hand and tap the opposite shoulder.', 'Put it down and switch, keeping your hips still.', 'Move to the full version when these get easy.'],
    cues: 'Straight line from knees to head.',
  },
};
