// Exercise pictures: openly licensed images stored in the app (so they work offline), always credited.
import { h } from './dom.js';
import { EXERCISES } from '../library.js';

function creditLine(im) {
  if (im.own) return ['Image: ', im.credit];
  return [
    'Image: ', im.credit, ', ',
    h('a', { href: im.licenseUrl, target: '_blank', rel: 'noopener noreferrer' }, im.license),
    im.changes ? `, ${im.changes}` : '',
  ];
}

export function exerciseFigure(exerciseId) {
  const ex = EXERCISES[exerciseId];
  const im = ex && ex.image;
  if (!im) return null;
  return h('figure', { class: `ex-fig${im.srcs.length > 1 ? ' pair' : ''}` },
    h('div', { class: 'ex-fig-imgs' }, im.srcs.map((x, i) => h('img', {
      src: x.src, alt: i === 0 ? im.alt : '', loading: 'lazy', decoding: 'async', width: x.w, height: x.h,
    }))),
    h('figcaption', null, im.note ? h('span', { class: 'note' }, im.note) : null, h('span', null, creditLine(im))));
}

export function imageCredits() {
  const rows = Object.values(EXERCISES).filter((ex) => ex.image);
  if (!rows.length) return null;
  return h('div', { class: 'list' }, rows.map((ex) => h('div', { class: 'list-item' },
    h('span', { class: 'grow small' },
      h('b', null, ex.name), h('br'),
      creditLine(ex.image),
      ex.image.sourceUrl ? [', ', h('a', { href: ex.image.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, 'source')] : null))));
}
