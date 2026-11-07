// Exercise pictures: openly licensed images stored in the app (so they work offline), always credited.
import { h } from './dom.js';
import { EXERCISES } from '../library.js';
import { VARIATION_IMAGES } from '../routines.js';

function creditLine(im) {
  if (im.own) return ['Image: ', im.credit];
  return [
    'Image: ', im.credit, ', ',
    h('a', { href: im.licenseUrl, target: '_blank', rel: 'noopener noreferrer' }, im.license),
    im.changes ? `, ${im.changes}` : '',
  ];
}

// The picture for the version being done: its own where one exists, otherwise the exercise's, labelled.
export function exerciseFigure(exerciseId, variation = null) {
  const ex = EXERCISES[exerciseId];
  if (!ex) return null;
  const other = variation && variation !== ex.name ? Object.values(EXERCISES).find((e) => e.name === variation) : null;
  const own = variation && variation !== ex.name ? VARIATION_IMAGES[variation] || (other && other.image) || null : null;
  const im = own || ex.image;
  if (!im) return null;
  const stand = variation && variation !== ex.name && !own ? `Picture shows the ${ex.name.toLowerCase()}; the steps below are for this version.` : null;
  return h('figure', { class: `ex-fig${im.srcs.length > 1 ? ' pair' : ''}` },
    h('div', { class: 'ex-fig-imgs' }, im.srcs.map((x, i) => h('img', {
      src: x.src, alt: i === 0 ? im.alt : '', loading: 'lazy', decoding: 'async', width: x.w, height: x.h,
    }))),
    h('figcaption', null, stand || im.note ? h('span', { class: 'note' }, stand || im.note) : null, h('span', null, creditLine(im))));
}

export function imageCredits() {
  const rows = [
    ...Object.values(EXERCISES).filter((ex) => ex.image).map((ex) => [ex.name, ex.image]),
    ...Object.entries(VARIATION_IMAGES),
  ];
  if (!rows.length) return null;
  return h('div', { class: 'list' }, rows.map(([name, im]) => h('div', { class: 'list-item' },
    h('span', { class: 'grow small' },
      h('b', null, name), h('br'),
      creditLine(im),
      im.sourceUrl ? [', ', h('a', { href: im.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, 'source')] : null))));
}
