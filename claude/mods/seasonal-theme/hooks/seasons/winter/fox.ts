import type { PileView } from '../../../types'
import { r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'
import { holdAfterPopout, visitMarkup } from '../../stage/visits'

import { FOX_X, OFFSTAGE_X, snowTopAt } from './geometry'
import { moveOf } from './snow'

// The visiting fox: faces left, feet on y=0, about 85 tall. Its head and leg pairs animate,
// so those groups carry no transform of their own.
export const FOX_BODY =
  '<path class="fox" d="M28 -38C70 -62 100 -34 84 -12C72 2 52 -14 36 -28Z"/>' +
  '<circle class="fox-light" cx="84" cy="-16" r="9"/>' +
  '<g class="leg-b"><rect class="fox-dark" x="22" y="-28" width="6" height="28" rx="2"/><rect class="fox-dark" x="32" y="-28" width="6" height="28" rx="2"/></g>' +
  '<ellipse class="fox" cx="12" cy="-38" rx="34" ry="16"/>' +
  '<g class="leg-a"><rect class="fox-dark" x="-16" y="-28" width="6" height="28" rx="2"/><rect class="fox-dark" x="-6" y="-28" width="6" height="28" rx="2"/></g>' +
  '<ellipse class="fox-light" cx="-14" cy="-36" rx="10" ry="11"/>' +
  '<g class="head">' +
  '<path class="fox" d="M-14 -66L-12 -82L-2 -64Z"/><path class="fox" d="M-26 -64L-28 -80L-16 -64Z"/>' +
  '<path class="fox" d="M-6 -62C-10 -48 -16 -42 -24 -40L-50 -46L-28 -66Z"/>' +
  '<path class="fox-light" d="M-50 -46L-30 -43L-22 -40L-34 -40Z"/>' +
  '<circle class="fox-dark" cx="-51" cy="-46" r="3"/><circle class="fox-dark" cx="-22" cy="-56" r="2.5"/>' +
  '</g>'

// A head cock at each beat of a visit, as if listening to the snow.
export const tiltKeyframes = (name: string, beats: readonly number[], pct: (at: number) => number): string => {
  const stops = beats.map(at => `${pct(at)}%{transform:none}${pct(at + 0.15)}%,${pct(at + 0.65)}%{transform:rotate(14deg)}${pct(at + 0.8)}%{transform:none}`)

  return `@keyframes ${name}{0%{transform:none}${stops.join('')}100%{transform:none}}`
}

// The tail standing out of the snow at 90% and up, swishing.
const TAIL =
  '<g class="swish"><path class="fox" d="M-12 4C-18 -30 -8 -62 6 -86C22 -70 18 -30 12 4Z"/>' +
  '<path class="fox-light" d="M-4 -60C0 -72 4 -80 6 -86C14 -78 16 -70 15 -60C10 -56 2 -56 -4 -60Z"/></g>'

const PUFFS: readonly [number, number][] = [[-60, -50], [-30, -80], [0, -95], [30, -80], [60, -45], [-80, -15], [80, -20]]

export const FOX_CSS = [
  '.head,.leg-a,.leg-b{transform-box:fill-box}.head{transform-origin:85% 90%}.leg-a,.leg-b{transform-origin:50% 0}',
  '@keyframes stride{from{transform:rotate(-20deg)}to{transform:rotate(20deg)}}',
  '.tail{opacity:1}.swish{transform-box:fill-box;transform-origin:50% 100%;animation:swish 2.4s ease-in-out infinite alternate}',
  '@keyframes swish{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}',
].join('')

// Crossing into 90%: after the flurry and the rise it runs in, crouches, leaps, and goes in headfirst.
const diveMarkup = (top: number, parts: Parts): { behind: string; front: string } => {
  parts.css.push(
    '.dive{opacity:0;animation:dive 6s linear both}',
    `@keyframes dive{0%,50%{transform:translate(${OFFSTAGE_X}px,0);opacity:1}62%{transform:translate(740px,0)}` +
      '66%{transform:translate(740px,4px) scale(1,.86)}76%{transform:translate(680px,-170px) rotate(-40deg)}' +
      `86%{transform:translate(${FOX_X + 10}px,-30px) rotate(-86deg)}92%{transform:translate(${FOX_X}px,50px) rotate(-90deg);opacity:1}` +
      `100%{transform:translate(${FOX_X}px,70px) rotate(-90deg);opacity:0}}`,
    '.dive .leg-a{animation:stride .35s linear 3s 4 alternate}.dive .leg-b{animation:stride .35s linear 3s 4 alternate-reverse}',
    '.puff{opacity:0}',
    ...PUFFS.map(([x, y], i) => `.puff${i}{animation:puff${i} 6.2s ease-out both}@keyframes puff${i}{0%,89%{transform:translate(0,0) scale(.2);opacity:0}91%{opacity:1}100%{transform:translate(${x}px,${y}px) scale(1);opacity:0}}`),
    '.tail-in{transform-box:fill-box;transform-origin:50% 100%;animation:tailin 6.2s linear both}',
    '@keyframes tailin{0%,90%{transform:scaleY(0);opacity:0}95%{transform:scaleY(1.15);opacity:1}100%{transform:scaleY(1);opacity:1}}',
  )
  const puffs = PUFFS.map((_, i) => `<circle class="puff puff${i}" r="${8 + (i % 3) * 3}"/>`).join('')

  return {
    behind: `<g transform="translate(0 ${top})"><g class="dive">${FOX_BODY}</g></g>`,
    front: `<g transform="translate(${FOX_X} ${top})">${puffs}</g>`,
  }
}

// After a compact from 90% and up: it pops out of the old snow line and runs off.
const popoutMarkup = (view: PileView, parts: Parts): string => {
  const from = snowTopAt(view.fromFill)
  const drop = r(snowTopAt(view.fill) - from)
  parts.css.push(
    '.popout{opacity:0;animation:popout 6s linear both}',
    `@keyframes popout{0%{transform:translate(${FOX_X}px,40px);opacity:0}6%{transform:translate(${FOX_X}px,-70px);opacity:1}` +
      `20%{transform:translate(${FOX_X + 50}px,${drop}px)}30%{transform:translate(${FOX_X + 60}px,${drop}px)}` +
      `85%{transform:translate(${OFFSTAGE_X}px,${drop}px);opacity:1}100%{transform:translate(${OFFSTAGE_X}px,${drop}px);opacity:0}}`,
    '.popout .turn{transform:scaleX(-1)}',
    '.popout .leg-a{animation:stride .3s linear 1.8s 12 alternate}.popout .leg-b{animation:stride .3s linear 1.8s 12 alternate-reverse}',
  )

  return `<g transform="translate(0 ${from})"><g class="popout"><g class="turn">${FOX_BODY}</g></g></g>`
}

// The fox for this view: `behind` goes under the snow band, so a dive's plunge is hidden;
// `front` goes over it.
export const foxMarkup = (view: PileView, phase: number, parts: Parts): { behind: string; front: string } => {
  const top = snowTopAt(view.fill)
  const move = moveOf(view)
  const moving = (markup: string) => (move === '' ? markup : `<g class="${move}">${markup}</g>`)

  if (view.level === 4) {
    const isDive = view.transition === 'dive'
    const dive = isDive ? diveMarkup(top, parts) : { behind: '', front: '' }
    const tail = `<g transform="translate(${FOX_X} ${r(top + 6)})"><g class="tail${isDive ? ' tail-in' : ''}">${TAIL}</g></g>`

    return { behind: dive.behind, front: moving(tail) + dive.front }
  }

  const isPopout = view.transition === 'scatter' && view.from === 4
  const visit = visitMarkup(
    { body: FOX_BODY, x: FOX_X, y: top, offstageX: OFFSTAGE_X, head: tiltKeyframes },
    phase,
    isPopout ? holdAfterPopout(phase) : 0,
    parts,
  )

  return { behind: '', front: moving(visit) + (isPopout ? popoutMarkup(view, parts) : '') }
}
