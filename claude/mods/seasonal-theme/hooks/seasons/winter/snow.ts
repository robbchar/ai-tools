import type { PileView } from '../../../types'
import { r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

import { snowTopAt } from './geometry'
import { pts } from './shapes'

// The snow's bottom edge, deep enough that it still reaches the window's bottom while it sinks.
const DEEP = 1500

// Where the snow heaps against the house's left side, in right-stage units.
const HOUSE_DRIFT_X = 605

// The snow's surface in right-stage units: gentle waves, and a drift against the house.
export const surfaceAt = (x: number, fill: number): number =>
  r(snowTopAt(fill) + Math.sin(x / 140) * 5 + Math.sin(x / 53 + 1) * 2.5 - 14 * Math.exp(-(((x - HOUSE_DRIFT_X) / 70) ** 2)))

// How the snow moves into this view: up after a step, down after a drop or a compact.
const moveOf = (view: PileView): '' | 'rise' | 'sink' => {
  const shift = snowTopAt(view.fromFill) - snowTopAt(view.fill)

  if (shift > 0 && (view.transition === 'grow' || view.transition === 'dive')) {
    return 'rise'
  }

  return shift < 0 && (view.transition === 'shrink' || view.transition === 'scatter') ? 'sink' : ''
}

// The snow's move as a class suffix, its keyframes added once to `parts`.
const snowMove = (view: PileView, parts: Parts): string => {
  const move = moveOf(view)
  const shift = r(Math.abs(snowTopAt(view.fromFill) - snowTopAt(view.fill)))

  if (move === 'rise') {
    parts.css.push('.rise{animation:rise 1.5s ease-out 1.4s both}', `@keyframes rise{from{transform:translateY(${shift}px)}to{transform:none}}`)
  } else if (move === 'sink') {
    parts.css.push('.sink{animation:sink 1.8s ease-in-out both}', `@keyframes sink{from{transform:translateY(-${shift}px)}to{transform:none}}`)
  }

  return move === '' ? '' : ` ${move}`
}

// The snow across the whole window, drawn on the right stage so it lines up with the house.
export const snowBand = (view: PileView, parts: Parts): string => {
  const top: [number, number][] = []
  for (let x = -4000; x <= 1100; x += 25) top.push([x, surfaceAt(x, view.fill)])
  const shade = top.map(([x, y]) => [x, y + 8] as const)

  return (
    `<g class="snow-band${snowMove(view, parts)}" data-top="${snowTopAt(view.fill)}">` +
    `<polygon class="snow" points="${pts([...top, [1100, DEEP], [-4000, DEEP]])}"/>` +
    `<polyline class="snow-shade" points="${pts(shade)}"/>` +
    '</g>'
  )
}

// A drift heaped at the big tree's foot, on the left stage; only its hump clears the band.
export const treeDrift = (view: PileView): string => {
  const top = snowTopAt(view.fill)
  const edge: [number, number][] = []
  for (let x = -40; x <= 440; x += 20) edge.push([x, top + 8 - 26 * Math.exp(-(((x - 200) / 150) ** 2))])

  const move = moveOf(view)

  return `<polygon class="drift${move === '' ? '' : ` ${move}`}" points="${pts([...edge, [440, DEEP], [-40, DEEP]])}"/>`
}
