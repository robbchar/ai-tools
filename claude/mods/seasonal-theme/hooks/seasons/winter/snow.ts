import type { PileView } from '../../../types'
import { r } from '../../stage/svg'

import { snowTopAt } from './geometry'
import { pts } from './shapes'

// Where the snow heaps against the house's left side, in right-stage units.
const HOUSE_DRIFT_X = 605

// The snow's surface in right-stage units: gentle waves, and a drift against the house.
export const surfaceAt = (x: number, fill: number): number =>
  r(snowTopAt(fill) + Math.sin(x / 140) * 5 + Math.sin(x / 53 + 1) * 2.5 - 14 * Math.exp(-(((x - HOUSE_DRIFT_X) / 70) ** 2)))

// The snow across the whole window, drawn on the right stage so it lines up with the house.
export const snowBand = (view: PileView): string => {
  const top: [number, number][] = []
  for (let x = -4000; x <= 1100; x += 25) top.push([x, surfaceAt(x, view.fill)])
  const shade = top.map(([x, y]) => [x, y + 8] as const)

  return (
    `<g class="snow-band" data-top="${snowTopAt(view.fill)}">` +
    `<polygon class="snow" points="${pts([...top, [1100, 1010], [-4000, 1010]])}"/>` +
    `<polyline class="snow-shade" points="${pts(shade)}"/>` +
    '</g>'
  )
}

// A drift heaped at the big tree's foot, on the left stage; only its hump clears the band.
export const treeDrift = (view: PileView): string => {
  const top = snowTopAt(view.fill)
  const edge: [number, number][] = []
  for (let x = -40; x <= 440; x += 20) edge.push([x, top + 8 - 26 * Math.exp(-(((x - 200) / 150) ** 2))])

  return `<polygon class="drift" points="${pts([...edge, [440, 1010], [-40, 1010]])}"/>`
}
